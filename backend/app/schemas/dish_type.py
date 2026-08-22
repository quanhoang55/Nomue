from pydantic import Field

from app.schemas.common import ResponseModel


class DishTypeResponse(ResponseModel):
    name: str = Field(min_length=1)
