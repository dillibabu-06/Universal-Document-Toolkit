use anyhow::Result;
use wasmtime::*;
use std::path::{Path, PathBuf};
use std::fs;

pub struct PluginManager {
    engine: Engine,
    linker: Linker<()>,
    plugin_dir: PathBuf,
}

impl PluginManager {
    pub fn new<P: AsRef<Path>>(plugin_dir: P) -> Result<Self> {
        let engine = Engine::default();
        let linker = Linker::new(&engine);
        
        let path = plugin_dir.as_ref().to_path_buf();
        if !path.exists() {
            fs::create_dir_all(&path)?;
        }

        Ok(Self {
            engine,
            linker,
            plugin_dir: path,
        })
    }

    pub fn get_plugin_dir(&self) -> &Path {
        &self.plugin_dir
    }

    pub fn list_plugins(&self) -> Result<Vec<String>> {
        let mut plugins = Vec::new();
        if self.plugin_dir.exists() {
            for entry in fs::read_dir(&self.plugin_dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("wasm") {
                    if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                        plugins.push(name.to_string());
                    }
                }
            }
        }
        Ok(plugins)
    }

    pub fn execute_plugin(&self, plugin_name: &str, input_json: &str) -> Result<String> {
        let wasm_path = self.plugin_dir.join(format!("{}.wasm", plugin_name));
        if !wasm_path.exists() {
            return Err(anyhow::anyhow!("Plugin not found"));
        }

        let module = Module::from_file(&self.engine, &wasm_path)
            .map_err(|e| anyhow::anyhow!("Failed to load WASM module: {}", e))?;

        let mut store = Store::new(&self.engine, ());
        let instance = self.linker.instantiate(&mut store, &module)
            .map_err(|e| anyhow::anyhow!("Failed to instantiate WASM module: {}", e))?;

        // Extract exports
        let memory = instance.get_memory(&mut store, "memory")
            .ok_or_else(|| anyhow::anyhow!("WASM module must export 'memory'"))?;
        
        let alloc_func = instance.get_typed_func::<u32, u32>(&mut store, "alloc")
            .map_err(|e| anyhow::anyhow!("WASM module must export 'alloc' function: {}", e))?;
            
        let dealloc_func = instance.get_typed_func::<(u32, u32), ()>(&mut store, "dealloc")
            .map_err(|e| anyhow::anyhow!("WASM module must export 'dealloc' function: {}", e))?;

        let process_func = instance.get_typed_func::<(u32, u32), u64>(&mut store, "process")
            .map_err(|e| anyhow::anyhow!("WASM module must export 'process' function: {}", e))?;

        // 1. Allocate memory in guest for input string
        let input_bytes = input_json.as_bytes();
        let input_len = input_bytes.len() as u32;
        let input_ptr = alloc_func.call(&mut store, input_len)
            .map_err(|e| anyhow::anyhow!("Failed to call alloc: {}", e))?;

        // 2. Write input string to guest memory
        memory.write(&mut store, input_ptr as usize, input_bytes)
            .map_err(|e| anyhow::anyhow!("Failed to write to memory: {}", e))?;

        // 3. Call process function
        // Returns a u64 packed with (ptr: u32, len: u32)
        let result_packed = process_func.call(&mut store, (input_ptr, input_len))
            .map_err(|e| anyhow::anyhow!("Failed to call process: {}", e))?;
        
        let result_ptr = (result_packed >> 32) as u32;
        let result_len = (result_packed & 0xFFFFFFFF) as u32;

        // 4. Read result from guest memory
        let mut result_bytes = vec![0u8; result_len as usize];
        memory.read(&mut store, result_ptr as usize, &mut result_bytes)
            .map_err(|e| anyhow::anyhow!("Failed to read memory: {}", e))?;
        
        // 5. Deallocate input and result memory in guest
        dealloc_func.call(&mut store, (input_ptr, input_len))
            .map_err(|e| anyhow::anyhow!("Failed to call dealloc: {}", e))?;
        dealloc_func.call(&mut store, (result_ptr, result_len))
            .map_err(|e| anyhow::anyhow!("Failed to call dealloc: {}", e))?;

        let result_string = String::from_utf8(result_bytes)
            .map_err(|e| anyhow::anyhow!("Plugin returned invalid UTF-8: {}", e))?;

        Ok(result_string)
    }
}
