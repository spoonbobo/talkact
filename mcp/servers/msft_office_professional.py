from mcp.server.fastmcp import FastMCP
from pathlib import Path
import os

mcp = FastMCP("msft_office_professional")

# pandoc


@mcp.tool()
async def create_word_file(markdown_file_path: str, word_file_path: str) -> str:
    """
    Creates a word file from a markdown file at the specified path.
    
    Args:
        markdown_file_path: The path to the markdown file
        word_file_path: The path to the output file
    
    Returns:
        The path to the output file
    """
    # Ensure the markdown file exists
    if not os.path.exists(markdown_file_path):
        return f"Error: Markdown file not found at {markdown_file_path}"
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(word_file_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Run pandoc to convert markdown to docx
    import subprocess
    try:
        result = subprocess.run(
            ["pandoc", markdown_file_path, "-o", word_file_path],
            capture_output=True,
            text=True,
            check=True
        )
        return word_file_path
    except subprocess.CalledProcessError as e:
        return f"Error converting file: {e.stderr}"
    except FileNotFoundError:
        return "Error: Pandoc is not installed or not in PATH"

@mcp.tool()
async def create_powerpoint_file(markdown_file_path: str, ppt_file_path: str) -> str:
    """
    Creates a PowerPoint presentation from a markdown file at the specified path.
    
    Args:
        markdown_file_path: The path to the markdown file
        ppt_file_path: The path to the output PowerPoint file (.pptx)
    
    Returns:
        The path to the output file
    """
    # Ensure the markdown file exists
    if not os.path.exists(markdown_file_path):
        return f"Error: Markdown file not found at {markdown_file_path}"
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(ppt_file_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Run pandoc to convert markdown to PowerPoint
    import subprocess
    try:
        result = subprocess.run(
            ["pandoc", markdown_file_path, "-o", ppt_file_path],
            capture_output=True,
            text=True,
            check=True
        )
        return ppt_file_path
    except subprocess.CalledProcessError as e:
        return f"Error converting file: {e.stderr}"
    except FileNotFoundError:
        return "Error: Pandoc is not installed or not in PATH"

@mcp.tool()
async def create_excel_file(markdown_file_path: str, excel_file_path: str) -> str:
    """
    Creates an Excel file from a markdown file containing tables at the specified path.
    
    Args:
        markdown_file_path: The path to the markdown file with tables
        excel_file_path: The path to the output Excel file (.xlsx)
    
    Returns:
        The path to the output file
    """
    # Ensure the markdown file exists
    if not os.path.exists(markdown_file_path):
        return f"Error: Markdown file not found at {markdown_file_path}"
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(excel_file_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Run pandoc to convert markdown to Excel
    import subprocess
    try:
        result = subprocess.run(
            ["pandoc", markdown_file_path, "-o", excel_file_path],
            capture_output=True,
            text=True,
            check=True
        )
        return excel_file_path
    except subprocess.CalledProcessError as e:
        return f"Error converting file: {e.stderr}"
    except FileNotFoundError:
        return "Error: Pandoc is not installed or not in PATH"

if __name__ == "__main__":
    mcp.run(transport='stdio')
