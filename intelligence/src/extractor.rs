use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtractedMetadata {
    pub fields: HashMap<String, String>,
}

/// Extract structured entities completely offline using Rust Regex heuristics
pub fn extract_entities_offline(category: &str, text: &str) -> Vec<(String, String, f32)> {
    let mut entities = Vec::new();

    if category == "Invoice" || category == "Receipt" {
        // Extract Amount
        if let Ok(re) = Regex::new(r"(?i)(?:Total|Amount Due|Balance)[\s:]*\$?([\d,]+\.\d{2})") {
            if let Some(caps) = re.captures(text) {
                if let Some(m) = caps.get(1) {
                    entities.push(("Amount".to_string(), format!("${}", m.as_str()), 0.9));
                }
            }
        }
        // Extract Vendor (heuristic: usually near the top, look for Vendor: or just assume first line for mock)
        if let Ok(re) = Regex::new(r"(?i)Vendor:\s*(.+)") {
            if let Some(caps) = re.captures(text) {
                if let Some(m) = caps.get(1) {
                    entities.push(("Vendor".to_string(), m.as_str().trim().to_string(), 0.85));
                }
            }
        }
    }

    if category == "Resume" {
        // Extract Email
        if let Ok(re) = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}") {
            if let Some(mat) = re.find(text) {
                entities.push(("Email".to_string(), mat.as_str().to_string(), 0.99));
            }
        }
    }

    entities
}
