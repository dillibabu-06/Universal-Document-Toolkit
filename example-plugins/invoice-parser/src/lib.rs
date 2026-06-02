use std::mem;
use serde::Serialize;

#[derive(Serialize)]
pub struct EntityResult {
    pub key: String,
    pub value: String,
    pub confidence: f32,
}

// Memory allocator for the host to write to
#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut buf = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    mem::forget(buf);
    ptr
}

/// # Safety
/// This function is unsafe because it frees raw pointers.
#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut u8, size: usize) {
    let _ = Vec::from_raw_parts(ptr, 0, size);
}

#[no_mangle]
#[allow(clippy::not_unsafe_ptr_arg_deref)]
pub extern "C" fn process(ptr: *mut u8, len: usize) -> u64 {
    let input_bytes = unsafe { std::slice::from_raw_parts(ptr, len) };
    let input_str = std::str::from_utf8(input_bytes).unwrap_or("");

    // Simulate extraction logic:
    let mut results = Vec::new();
    if input_str.to_lowercase().contains("amazon") {
        results.push(EntityResult {
            key: "Vendor".to_string(),
            value: "Amazon".to_string(),
            confidence: 0.99,
        });
    } else {
        results.push(EntityResult {
            key: "Vendor".to_string(),
            value: "Unknown (WASM Plugin)".to_string(),
            confidence: 0.50,
        });
    }

    let output_json = serde_json::to_string(&results).unwrap_or_else(|_| "[]".to_string());
    
    let mut output_bytes = output_json.into_bytes();
    let out_ptr = output_bytes.as_mut_ptr();
    let out_len = output_bytes.len();
    mem::forget(output_bytes);

    // Pack pointer and length into a u64
    ((out_ptr as u64) << 32) | (out_len as u64)
}
