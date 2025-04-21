from mcp.server.fastmcp import FastMCP
from pathlib import Path
import os

mcp = FastMCP("msft_office_professional")


@mcp.tool()
async def create_excel_file(data_file_path: str, ouput_file_path: str) -> str:
    """
    Creates an excel file at the specified path.
    
    Args:
        data_file_path: The path to the data file
        ouput_file_path: The path to the output file
    
    Returns:
        The path to the output file
    """
    return ""

@mcp.tool()
async def create_word_file(data_file_path: str, ouput_file_path: str) -> str:
    """
    Creates a word file at the specified path.
    
    Args:
        data_file_path: The path to the data file
        ouput_file_path: The path to the output file
    
    Returns:
        The path to the output file
    """
    return ""

@mcp.tool()
async def create_powerpoint_file(data_file_path: str, ouput_file_path: str) -> str:
    """
    Creates a powerpoint file at the specified path.
    
    Args:
        data_file_path: The path to the data file
        ouput_file_path: The path to the output file
    
    Returns:
        The path to the output file
    """
    return ""

if __name__ == "__main__":
    mcp.run(transport='stdio')