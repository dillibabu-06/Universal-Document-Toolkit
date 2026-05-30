use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtractedMetadata {
    pub fields: HashMap<String, String>,
}

#[derive(Serialize)]
struct ExtractRequest<'a> {
    category: &'a str,
    text: &'a str,
}

/// Dynamic NLP-based structured metadata extractor calling FastAPI backend (Phase 9)
pub fn extract_metadata(category: &str, text: &str) -> String {
    // Truncate text to 50k chars to avoid blowing up JSON payloads
    let truncated_text: String = text.chars().take(50000).collect();
    
    let req_data = ExtractRequest {
        category,
        text: &truncated_text,
    };
    
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .unwrap_or_default();
        
    let res = client.post("http://localhost:8000/api/intelligence/extract")
        .json(&req_data)
        .send();
        
    if let Ok(response) = res {
        if response.status().is_success() {
            if let Ok(metadata) = response.json::<ExtractedMetadata>() {
                return serde_json::to_string(&metadata).unwrap_or_else(|_| "{}".to_string());
            }
        } else {
            tracing::error!("Intelligence extraction failed: {}", response.status());
        }
    } else if let Err(e) = res {
        tracing::error!("Failed to contact intelligence backend: {}", e);
    }
    
    "{}".to_string()
}
