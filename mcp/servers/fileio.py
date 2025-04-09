from mcp.server.fastmcp import FastMCP
from pathlib import Path
import os

mcp = FastMCP("fileio")

@mcp.tool()
async def write_text_to_file(file_path: str, text: str) -> str:
    """
    Writes text content to a file at the specified path.
    Creates parent directories if they don't exist.
    
    Args:
        file_path: The path where the file should be written
        text: The text content to write to the file
        
    Returns:
        The absolute path where the file was written
    """
    path = Path(file_path)
    os.makedirs(path.parent, exist_ok=True)
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    
    return f"Text written to {str(path.absolute())}"

if __name__ == "__main__":
    mcp.run(transport='stdio')
