use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ExtractedMetadata {
    pub fields: HashMap<String, String>,
}

/// Dynamic regex-based structured metadata extractor for SDW Phase E.
pub fn extract_metadata(category: &str, text: &str) -> String {
    let mut fields = HashMap::new();
    let text_lower = text.to_lowercase();

    match category {
        "Invoice" => {
            // 1. Invoice Number
            if let Some(re) = Regex::new(r"(?i)invoice\s*(?:no|num|number|#)?\s*:?\s*([a-zA-Z0-9\-]+)").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("invoice_number".to_string(), cap[1].trim().to_string());
                }
            }
            // 2. Vendor Name (Bill From / Company Name heuristics)
            if let Some(re) = Regex::new(r"(?i)(?:bill\s*from|vendor|seller)\s*:?\s*\n*([a-zA-Z0-9\s,&.\-]+)").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("vendor_name".to_string(), cap[1].trim().to_string());
                }
            }
            // 3. Due Date
            if let Some(re) = Regex::new(r"(?i)due\s*date\s*:?\s*([0-9]{2,4}[-/\.][0-9]{2}[-/\.][0-9]{2,4}|[a-zA-Z]+\s+[0-9]{1,2},\s*[0-9]{4}|[0-9]{1,2}\s+[a-zA-Z]+,\s*[0-9]{4})").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("due_date".to_string(), cap[1].trim().to_string());
                }
            }
            // 4. Total Amount
            if let Some(re) = Regex::new(r"(?i)(?:total|balance|amount)\s*(?:due|payable|amount)?\s*:?\s*(?:\$|rs|inr|€|£)?\s*([0-9,]+\.[0-9]{2})").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("total_amount".to_string(), cap[1].trim().to_string());
                }
            }
            // 5. Tax Amount
            if let Some(re) = Regex::new(r"(?i)(?:gst|tax|vat|cgst|sgst)\s*(?:amount)?\s*:?\s*(?:\$|rs|inr|€|£)?\s*([0-9,]+\.[0-9]{2})").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("tax_amount".to_string(), cap[1].trim().to_string());
                }
            }
        }
        "Resume" => {
            // 1. Candidate Name (Heuristic: first non-empty line under 5 words)
            let first_line = text.lines()
                .map(|l| l.trim())
                .filter(|l| !l.is_empty())
                .next()
                .unwrap_or("");
            if !first_line.is_empty() && first_line.split_whitespace().count() <= 4 {
                fields.insert("candidate_name".to_string(), first_line.to_string());
            }

            // 2. Email Address
            if let Some(re) = Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("email".to_string(), cap[0].trim().to_string());
                }
            }

            // 3. Years of Experience
            if let Some(re) = Regex::new(r"([0-9]+)\+?\s*(?:years|yrs)\s*(?:of)?\s*experience").ok() {
                if let Some(cap) = re.captures(&text_lower) {
                    fields.insert("years_of_experience".to_string(), cap[1].trim().to_string());
                }
            }

            // 4. Skills extraction
            let skills_list = vec!["rust", "react", "typescript", "javascript", "python", "sqlite", "postgresql", "aws", "docker", "c++", "java", "kubernetes", "go", "solidity"];
            let mut found_skills = Vec::new();
            for skill in skills_list {
                if text_lower.contains(skill) {
                    found_skills.push(skill.to_uppercase());
                }
            }
            if !found_skills.is_empty() {
                fields.insert("skills".to_string(), found_skills.join(", "));
            }
        }
        "Receipt" => {
            // 1. Store/Merchant Name
            let first_line = text.lines()
                .map(|l| l.trim())
                .filter(|l| !l.is_empty())
                .next()
                .unwrap_or("Unknown Store");
            fields.insert("merchant".to_string(), first_line.to_string());

            // 2. Total Amount
            if let Some(re) = Regex::new(r"(?i)(?:total|amount\s*paid|paid|charge|due)\s*:?\s*(?:\$|rs|inr|€|£)?\s*([0-9,]+\.[0-9]{2})").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("total_paid".to_string(), cap[1].trim().to_string());
                }
            }
            // 3. Transaction ID
            if let Some(re) = Regex::new(r"(?i)(?:transaction|receipt|txn)\s*(?:id|no|#)?\s*:?\s*([a-zA-Z0-9\-]+)").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("transaction_id".to_string(), cap[1].trim().to_string());
                }
            }
            // 4. Date
            if let Some(re) = Regex::new(r"(?i)(?:date|time)\s*:?\s*([0-9]{2,4}[-/\.][0-9]{2}[-/\.][0-9]{2,4})").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("date".to_string(), cap[1].trim().to_string());
                }
            }
        }
        "Bank Statement" => {
            // 1. Bank Name Heuristics
            let banks = vec!["chase", "hsbc", "hdfc", "icici", "citi", "barclays", "bank of america", "wells fargo", "stripe", "paypal"];
            for bank in banks {
                if text_lower.contains(bank) {
                    fields.insert("bank_name".to_string(), bank.to_uppercase());
                    break;
                }
            }

            // 2. Account Number
            if let Some(re) = Regex::new(r"(?i)(?:account\s*number|ac\s*no|a/c\s*no|account\s*#)\s*:?\s*([0-9a-zA-Z\-*]+)").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("account_number".to_string(), cap[1].trim().to_string());
                }
            }

            // 3. Closing Balance
            if let Some(re) = Regex::new(r"(?i)(?:closing|ending|new)\s*balance\s*:?\s*(?:\$|rs|inr|€|£)?\s*([0-9,\-]+\.[0-9]{2})").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("closing_balance".to_string(), cap[1].trim().to_string());
                }
            }

            // 4. Period
            if let Some(re) = Regex::new(r"(?i)(?:period|statement\s*period)\s*:?\s*([0-9a-zA-Z\/\-\s,]+)").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("statement_period".to_string(), cap[1].trim().to_string());
                }
            }
        }
        "Contract" => {
            // 1. Parties In Agreement
            if let Some(re) = Regex::new(r"(?i)(?:between|among)\s+([a-zA-Z0-9\s,()]+)\s+and\s+([a-zA-Z0-9\s,()]+)").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("party_one".to_string(), cap[1].trim().to_string());
                    fields.insert("party_two".to_string(), cap[2].trim().to_string());
                }
            }
            // 2. Agreement Date
            if let Some(re) = Regex::new(r"(?i)agreement\s*date\s*:?\s*([0-9a-zA-Z\/\-\s,]+)").ok() {
                if let Some(cap) = re.captures(text) {
                    fields.insert("agreement_date".to_string(), cap[1].trim().to_string());
                }
            }
            // 3. Contract Type
            let contract_types = vec!["non-disclosure agreement", "nda", "memorandum of understanding", "mou", "employment contract", "lease agreement", "service agreement"];
            for ct in contract_types {
                if text_lower.contains(ct) {
                    fields.insert("contract_type".to_string(), ct.to_uppercase());
                    break;
                }
            }
        }
        _ => {}
    }

    serde_json::to_string(&ExtractedMetadata { fields }).unwrap_or_else(|_| "{}".to_string())
}
