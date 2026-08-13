# ==========================================================================
# Purpose: Normalize Unicode
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
from uuid import uuid4

from pandas import DataFrame, Series


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
def generate_id(df: DataFrame, column_name: str = "ID") -> DataFrame:
    if column_name in df.columns:
        return df
    df[column_name] = [str(uuid4()) for _ in range(len(df))]
    return df


def map_id(
    df_1: DataFrame,
    df_1_old_id: str,
    df_1_new_id: str,
    df_2: DataFrame,
    df_2_old_id: str,
) -> None:
    id_map = df_1.set_index(df_1_old_id)[df_1_new_id]

    for index in df_2.index:
        old_id = df_2.loc[index, df_2_old_id]

        if old_id not in id_map.index:
            raise ValueError(f"Cannot find old ID: {old_id}")

        df_2.loc[index, df_2_old_id] = id_map.loc[old_id]
