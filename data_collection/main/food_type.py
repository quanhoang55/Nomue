import os

import pandas as pd
from supabase import create_client

from main.util.paths import CLEAN_PATH

SUPABASE_URL = "https://qqxlzzgjydsebluhevlf.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "sb_secret_TF_zGHGQ34zifOn8UUunNQ_c92rklGm"

dish_new_path = os.path.join(CLEAN_PATH, "dish_new.xlsx")

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
)

# Read the Excel file
df = pd.read_excel(dish_new_path)

# Only keep what we need
df = df[["id", "dish_type_id"]]

for _, row in df.iterrows():
    supabase.table("dish").update({"dish_type_id": row["dish_type_id"]}).eq(
        "id", row["id"]
    ).execute()

print(f"Updated {len(df)} dishes")
