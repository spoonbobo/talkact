from mcp.server.fastmcp import FastMCP

mcp = FastMCP("fileio")

# @mcp.tool()
# async def read_file(file_path: str) -> str:
#     with open(file_path, 'r') as file:
#         return file.read()


@mcp.tool()
async def write_text_to_file(file_path: str, text: str) -> str:
    return ""

if __name__ == "__main__":
    mcp.run(transport='stdio')
