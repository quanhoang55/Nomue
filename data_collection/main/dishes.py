# ==========================================================================
# Purpose: DISHES
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import json
import os

import pandas as pd

from main.util.generate_id import generate_id
from main.util.normalize_text import normalize_unicode
from main.util.paths import CLEAN_PATH, RAW_DISH

# ==========================================================================
# PARAMETERS
# ==========================================================================
df = pd.read_excel(RAW_DISH)


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
def view(df: pd.DataFrame):

    print("=" * 60)
    print("FIRST ROW")
    print(json.dumps(df.iloc[0].to_dict(), indent=4, default=str))

    print("=" * 60)
    print("INFO")
    df.info(verbose=True)

    print("=" * 60)
    print("DATA TYPES")
    print(df.dtypes)

    print("=" * 60)
    print("UNIQUE VALUES")
    print(df.nunique())

    print("=" * 60)
    print("DUPLICATES:", df.duplicated().sum())


def export_xlsx(df: pd.DataFrame, filename: str, index: bool = False) -> None:
    """
    Export a DataFrame to a CSV file.
    """
    if not filename.endswith(".xlsx"):
        raise ValueError("filename must end with '.xlsx'")
    df.to_excel(filename, index=index)
    print(f"[DONE] Data exported to '{filename}'")


# ==========================================================================
# MAIN EXECUTION ENTRYPOINT
# ==========================================================================
def main():
    new_df = df.drop_duplicates()
    view(new_df)
    export_path = os.path.join(CLEAN_PATH, "dish.xlsx")
    export_xlsx(new_df, export_path)


if __name__ == "__main__":
    main()
