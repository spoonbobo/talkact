from mcp.server.fastmcp import FastMCP
import aiohttp
import os
from pathlib import Path
from urllib.parse import urlparse

mcp = FastMCP("web_fetcher")

@mcp.tool()
async def download_file_from_internet(url: str, destination_path: str) -> str:
    """
    Downloads a file from the internet and saves it to the specified path.
    
    Args:
        url: The URL to download from
        destination_path: Where to save the file on disk
        
    Returns:
        The absolute path where the file was saved
    """
    destination = Path(destination_path)
    
    # Check if destination is a directory
    if destination.is_dir():
        # Extract filename from URL if destination is a directory
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if not filename:
            filename = "downloaded_file"
        destination = destination / filename
    
    os.makedirs(destination.parent, exist_ok=True)
    
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status != 200:
                raise Exception(f"Failed to download: HTTP {response.status}")
            
            with open(destination, 'wb') as f:
                while True:
                    chunk = await response.content.read(1024)
                    if not chunk:
                        break
                    f.write(chunk)
    
    return f"Downloaded file to {str(destination.absolute())}"

@mcp.tool()
async def download_multiple_files_from_internet(urls: list[str], destination_path: str) -> list[str]:
    """
    Downloads multiple files from the internet and saves them to the specified path.
    
    Args:
        urls: A list of URLs to download from
        destination_path: Where to save the files on disk (directory)
        
    Returns:
        A list of absolute paths where the files were saved
    """
    destination = Path(destination_path)
    
    # Ensure destination exists and is a directory
    if not destination.exists():
        os.makedirs(destination, exist_ok=True)
    elif not destination.is_dir():
        raise ValueError(f"Destination path must be a directory: {destination_path}")
    
    downloaded_paths = []
    
    async with aiohttp.ClientSession() as session:
        for url in urls:
            # Extract filename from URL
            parsed_url = urlparse(url)
            filename = os.path.basename(parsed_url.path)
            if not filename:
                filename = f"downloaded_file_{len(downloaded_paths) + 1}"
            
            file_destination = destination / filename
            
            try:
                async with session.get(url) as response:
                    if response.status != 200:
                        downloaded_paths.append(f"Failed to download {url}: HTTP {response.status}")
                        continue
                    
                    with open(file_destination, 'wb') as f:
                        while True:
                            chunk = await response.content.read(1024)
                            if not chunk:
                                break
                            f.write(chunk)
                
                downloaded_paths.append(str(file_destination.absolute()))
            except Exception as e:
                downloaded_paths.append(f"Failed to download {url}: {str(e)}")
    
    return downloaded_paths

if __name__ == "__main__":
    # Initialize and run the server
    print("Starting web fetcher server")
    mcp.run(transport='stdio')