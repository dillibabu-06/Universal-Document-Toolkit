use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtractedMetadata {
    pub fields: HashMap<String, String>,
}

/// Extract structured entities completely offline using advanced Rust Regex heuristics
#[allow(clippy::collapsible_if)]
pub fn extract_entities_offline(category: &str, text: &str) -> Vec<(String, String, f32)> {
    let mut entities = Vec::new();
    let text_lower = text.to_lowercase();

    // 1. Common entity matches across all categories
    // Email Address
    if let Ok(re) = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}") {
        if let Some(mat) = re.find(text) {
            entities.push(("Email".to_string(), mat.as_str().to_string(), 0.99));
        }
    }
    // Phone Number
    if let Ok(re) = Regex::new(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b") {
        if let Some(mat) = re.find(text) {
            entities.push(("Phone".to_string(), mat.as_str().to_string(), 0.90));
        }
    }

    if category == "Invoice" || category == "Receipt" {
        // Extract Clean TotalAmount (for SQLite CAST compatibility)
        if let Ok(re) = Regex::new(r"(?i)(?:Total|Amount Due|Balance|Net Payable)[\s:]*\$?([\d,]+\.\d{2})") {
            if let Some(caps) = re.captures(text) {
                if let Some(m) = caps.get(1) {
                    let clean_amount = m.as_str().replace(",", "");
                    entities.push(("TotalAmount".to_string(), clean_amount, 0.95));
                }
            }
        }
        
        // Extract Vendor / Merchant Name
        let mut vendor_extracted = false;
        if let Ok(re) = Regex::new(r"(?i)(?:Vendor|Merchant|Company|Seller|Billed By)\s*:?\s*([a-zA-Z0-9\s.,&'-]+)") {
            if let Some(caps) = re.captures(text) {
                if let Some(m) = caps.get(1) {
                    entities.push(("Vendor".to_string(), m.as_str().trim().to_string(), 0.85));
                    vendor_extracted = true;
                }
            }
        }
        
        if !vendor_extracted {
            // Semantic fallback for well-known vendors
            if text_lower.contains("amazon") {
                entities.push(("Vendor".to_string(), "Amazon".to_string(), 0.8));
            } else if text_lower.contains("uber") {
                entities.push(("Vendor".to_string(), "Uber".to_string(), 0.8));
            } else if text_lower.contains("google") {
                entities.push(("Vendor".to_string(), "Google".to_string(), 0.8));
            } else if text_lower.contains("apple") {
                entities.push(("Vendor".to_string(), "Apple".to_string(), 0.8));
            }
        }

        // Extract Invoice / Reference Number
        if let Ok(re) = Regex::new(r"(?i)(?:Invoice\s*(?:#|Number|No\.?|ID)?|Reference\s*#?|INV-?)\s*:?\s*([a-zA-Z0-9-]+)") {
            if let Some(caps) = re.captures(text) {
                if let Some(m) = caps.get(1) {
                    entities.push(("InvoiceNumber".to_string(), m.as_str().trim().to_string(), 0.95));
                }
            }
        }

        // Extract Invoice Date
        if let Ok(re) = Regex::new(r"(?i)(?:Invoice\s*Date|Bill\s*Date|Date\s*of\s*Issue|Date)[\s:]*([0-9a-zA-Z\s/-]+)") {
            if let Some(caps) = re.captures(text) {
                if let Some(m) = caps.get(1) {
                    entities.push(("Date".to_string(), m.as_str().trim().to_string(), 0.90));
                }
            }
        }
    }

    if category == "Contract" {
        // Extract Contract Party
        if let Ok(re) = Regex::new(r"(?i)(?:Client|Contractor|First Party|Second Party|Customer|Agreement Between)\s*:?\s*([a-zA-Z0-9\s.,&'-]+)") {
            if let Some(caps) = re.captures(text) {
                if let Some(m) = caps.get(1) {
                    entities.push(("ContractParty".to_string(), m.as_str().trim().to_string(), 0.90));
                }
            }
        }
    }

    entities
}
