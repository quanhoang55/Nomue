# ==========================================================================
# Purpose: Utils
# ==========================================================================
# IMPORTS & MODULE LOADING
# ==========================================================================
import os

# ==========================================================================
# PARAMETERS
# ==========================================================================
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
MAIN_ROOT = os.path.dirname(PROJECT_ROOT)
PRIVATE_DATA = os.path.join(MAIN_ROOT, "private_data")

RAW_PATH = os.path.join(PRIVATE_DATA, "raw")
CLEAN_PATH = os.path.join(PRIVATE_DATA, "clean")

# DATA PATH
RAW_DATA = os.path.join(RAW_PATH, "vn_dish_data.xlsx")
RAW_DISH = os.path.join(RAW_PATH, "dish.xlsx")
RAW_DISH_PROVINCES = os.path.join(RAW_PATH, "dish_provinces.xlsx")
RAW_LOCAL_AREA = os.path.join(RAW_PATH, "local_area.xlsx")
RAW_PROVINCES = os.path.join(RAW_PATH, "province.xlsx")


# ==========================================================================
# CORE LOGIC & FUNCTIONS
# ==========================================================================
def check_path(path: str) -> bool:
    return os.path.exists(path)


# ==========================================================================
# MAIN EXECUTION ENTRYPOINT
# ==========================================================================
def main():
    path_check = RAW_LOCAL_AREA
    if check_path(path_check):
        print(check_path(path_check))
        print(path_check)
    else:
        print("Path does not exist")


if __name__ == "__main__":
    main()
