from mcp.server.fastmcp import FastMCP
from pathlib import Path
import os

mcp = FastMCP("msft_office_professional")

# pandoc


@mcp.tool()
async def create_word_file(markdown_text: str, word_file_path: str) -> str:
    """
    Creates a word file from markdown text.
    
    Args:
        markdown_text: The markdown content as text
        word_file_path: The path to the output file
    
    Returns:
        The path to the output file
    """
    import tempfile
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(word_file_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Create a temporary file with the markdown content
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as temp_file:
        temp_file.write(markdown_text)
        temp_markdown_path = temp_file.name
    
    # Run pandoc to convert markdown to docx
    import subprocess
    try:
        result = subprocess.run(
            ["pandoc", temp_markdown_path, "-o", word_file_path],
            capture_output=True,
            text=True,
            check=True
        )
        # Clean up the temporary file
        os.unlink(temp_markdown_path)
        return word_file_path
    except subprocess.CalledProcessError as e:
        # Clean up the temporary file
        os.unlink(temp_markdown_path)
        return f"Error converting file: {e.stderr}"
    except FileNotFoundError:
        # Clean up the temporary file
        os.unlink(temp_markdown_path)
        return "Error: Pandoc is not installed or not in PATH"

@mcp.tool()
async def create_powerpoint_file(markdown_text: str, ppt_file_path: str) -> str:
    """
    Creates a PowerPoint presentation from markdown text.
    
    Args:
        markdown_text: The markdown content as text
        ppt_file_path: The path to the output PowerPoint file (.pptx)
    
    Returns:
        The path to the output file
    """
    import tempfile
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(ppt_file_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Create a temporary file with the markdown content
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as temp_file:
        temp_file.write(markdown_text)
        temp_markdown_path = temp_file.name
    
    # Run pandoc to convert markdown to PowerPoint
    import subprocess
    try:
        result = subprocess.run(
            ["pandoc", temp_markdown_path, "-o", ppt_file_path],
            capture_output=True,
            text=True,
            check=True
        )
        # Clean up the temporary file
        os.unlink(temp_markdown_path)
        return ppt_file_path
    except subprocess.CalledProcessError as e:
        # Clean up the temporary file
        os.unlink(temp_markdown_path)
        return f"Error converting file: {e.stderr}"
    except FileNotFoundError:
        # Clean up the temporary file
        os.unlink(temp_markdown_path)
        return "Error: Pandoc is not installed or not in PATH"

@mcp.tool()
async def create_excel_file(markdown_text: str, excel_file_path: str) -> str:
    """
    Creates an Excel file from markdown text containing tables.
    
    Args:
        markdown_text: The markdown content with tables as text
        excel_file_path: The path to the output Excel file (.xlsx)
    
    Returns:
        The path to the output file
    """
    import tempfile
    
    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(excel_file_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Create a temporary file with the markdown content
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as temp_file:
        temp_file.write(markdown_text)
        temp_markdown_path = temp_file.name
    
    # Run pandoc to convert markdown to Excel
    import subprocess
    try:
        result = subprocess.run(
            ["pandoc", temp_markdown_path, "-o", excel_file_path],
            capture_output=True,
            text=True,
            check=True
        )
        # Clean up the temporary file
        os.unlink(temp_markdown_path)
        return excel_file_path
    except subprocess.CalledProcessError as e:
        # Clean up the temporary file
        os.unlink(temp_markdown_path)
        return f"Error converting file: {e.stderr}"
    except FileNotFoundError:
        # Clean up the temporary file
        os.unlink(temp_markdown_path)
        return "Error: Pandoc is not installed or not in PATH"

if __name__ == "__main__":
    mcp.run(transport='stdio')
