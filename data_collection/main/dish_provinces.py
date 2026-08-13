# ==========================================================================
# Purpose: DISHES
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import json
import os

import pandas as pd

from main.util.generate_id import map_id
from main.util.paths import CLEAN_PATH, RAW_DISH_PROVINCES, RAW_PROVINCES

# ==========================================================================
# PARAMETERS
# ==========================================================================
df_dp = pd.read_excel(RAW_DISH_PROVINCES)
df_p = pd.read_excel(RAW_PROVINCES)


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
    map_id(df_p, "id", "ID", df_dp, "province_id")
    export_path = os.path.join(CLEAN_PATH, "dish_province.xlsx")
    export_xlsx(df_dp, export_path)


if __name__ == "__main__":
    main()
