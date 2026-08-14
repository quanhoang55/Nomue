# ==========================================================================
# Purpose: Upload Data Into Supabase
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
# import os

# import pandas as pd
# from dotenv import load_dotenv
# from supabase import Client, create_client

# from main.util.paths import (
#     CLEAN_DISH,
#     CLEAN_DISH_PROVINCES,
#     CLEAN_LOCAL_AREA,
#     CLEAN_PROVINCES,
# )

# # ==========================================================================
# # PARAMETERS
# # ==========================================================================
# load_dotenv()

# url = os.environ.get("SUPABASE_URL")
# key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
# supabase: Client = create_client(url, key)

# province = pd.read_excel(CLEAN_PROVINCES)
# local_area = pd.read_excel(CLEAN_LOCAL_AREA)
# dish = pd.read_excel(CLEAN_DISH)
# dish_province = pd.read_excel(CLEAN_DISH_PROVINCES)


# # ==========================================================================
# # CORE LOGIC & FUNCTIONS
# # ==========================================================================
# def supabase_insert(df: pd.DataFrame, table_name: str):
#     df = df.astype(object).where(pd.notna(df), None)
#     rows = df.to_dict(orient="records")
#     if not rows:
#         return None
#     try:
#         response = supabase.table(table_name).insert(rows).execute()
#         print(f"[SUCCESS] Inserted {len(rows)} rows into {table_name}")
#         return response
#     except Exception as ex:
#         print(f"[ERROR!]{ex}")
#         return None


# # ==========================================================================
# # MAIN EXECUTION ENTRYPOINT
# # ==========================================================================
# def main():
#     # supabase_insert(province, "province")
#     # supabase_insert(local_area, "local_area")
#     # supabase_insert(dish, "dish")
#     supabase_insert(dish_province, "dish_province")


# if __name__ == "__main__":
#     main()
