from pathlib import Path
import pandas as pd
from loguru import logger
import json

from backend.models.office_models import SpreadsheetStats, OfficeOperationResult

class SpreadsheetEngine:
    """Core engine for processing Spreadsheet (.xlsx, .csv) documents using pandas."""

    @staticmethod
    def read_preview(input_path: Path, max_rows: int = 50) -> dict:
        """Reads the first few rows of a spreadsheet and returns a JSON-serializable dictionary."""
        try:
            if input_path.suffix.lower() == '.csv':
                df = pd.read_csv(input_path, nrows=max_rows)
            else:
                df = pd.read_excel(input_path, nrows=max_rows)
                
            # Replace NaNs with None for JSON serialization
            df = df.where(pd.notnull(df), None)
            
            return {
                "columns": df.columns.tolist(),
                "data": df.to_dict(orient='records')
            }
        except Exception as e:
            logger.error(f"Failed to preview spreadsheet {input_path}: {e}")
            return {"error": str(e)}

    @staticmethod
    def generate_statistics(input_path: Path) -> SpreadsheetStats | None:
        """Generates summary statistics for numerical columns in a spreadsheet."""
        try:
            sheet_names = []
            if input_path.suffix.lower() == '.csv':
                df = pd.read_csv(input_path)
                sheet_names = ["CSV Data"]
            else:
                # Read all sheets to get names, but process the first one for stats for simplicity
                xl = pd.ExcelFile(input_path)
                sheet_names = xl.sheet_names
                df = xl.parse(sheet_names[0])
            
            row_count, col_count = df.shape
            
            # Numeric summary
            num_summary = None
            numeric_cols = df.select_dtypes(include='number')
            if not numeric_cols.empty:
                num_summary = numeric_cols.describe().to_dict()
                
            return SpreadsheetStats(
                row_count=row_count,
                column_count=col_count,
                sheet_names=sheet_names,
                numeric_columns_summary=num_summary
            )
        except Exception as e:
            logger.error(f"Failed to generate statistics for {input_path}: {e}")
            return None

    @staticmethod
    def merge_spreadsheets(input_paths: list[Path], output_path: Path) -> OfficeOperationResult:
        """Merges multiple CSVs or Excel sheets into a single CSV or XLSX file."""
        try:
            if not input_paths:
                return OfficeOperationResult(success=False, error_message="No input paths provided")
                
            dataframes = []
            for p in input_paths:
                if p.suffix.lower() == '.csv':
                    dataframes.append(pd.read_csv(p))
                else:
                    dataframes.append(pd.read_excel(p))
            
            merged_df = pd.concat(dataframes, ignore_index=True)
            
            if output_path.suffix.lower() == '.csv':
                merged_df.to_csv(output_path, index=False)
            else:
                merged_df.to_excel(output_path, index=False)
                
            return OfficeOperationResult(success=True, file_path=output_path)
        except Exception as e:
            logger.error(f"Failed to merge spreadsheets: {e}")
            return OfficeOperationResult(success=False, error_message=str(e))

    @staticmethod
    def convert_format(input_path: Path, output_path: Path) -> OfficeOperationResult:
        """Converts between CSV and XLSX."""
        try:
            if input_path.suffix.lower() == '.csv':
                df = pd.read_csv(input_path)
            else:
                df = pd.read_excel(input_path)
                
            if output_path.suffix.lower() == '.csv':
                df.to_csv(output_path, index=False)
            else:
                df.to_excel(output_path, index=False)
                
            return OfficeOperationResult(success=True, file_path=output_path)
        except Exception as e:
            logger.error(f"Failed to convert spreadsheet {input_path}: {e}")
            return OfficeOperationResult(success=False, error_message=str(e))
