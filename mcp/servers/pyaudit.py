from typing import Any, List
import httpx
import subprocess
import tempfile
import json
import os
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP server
mcp = FastMCP("pyaudit")

@mcp.tool()
async def audit_packages(packages: List[str]) -> str:
    """Audit Python packages for known vulnerabilities.

    Args:
        packages: List of Python packages (e.g. ["django", "requests==2.28.1"])
        
    Returns:
        Report of vulnerabilities found with IDs, descriptions, and fix versions.
    
    Example: audit_packages(["django==3.2.0", "requests"])
    """
    # Create a temporary requirements file
    with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt') as tmp:
        for package in packages:
            tmp.write(f"{package}\n")
        tmp_path = tmp.name
    
    try:
        # Run pip-audit against the temporary requirements file
        result = subprocess.run(
            ["pip-audit", "-r", tmp_path, "--format", "json"],
            capture_output=True,
            text=True,
            check=False  # Don't raise exception on non-zero exit code
        )
        
        # Parse the JSON output
        if result.stdout:
            try:
                # Format the results in a user-friendly way
                return format_audit_results(result.stdout)
            except json.JSONDecodeError:
                # If JSON parsing fails, return the raw output
                return result.stdout
        else:
            return f"Error running pip-audit: {result.stderr}"
    finally:
        # Clean up the temporary file
        os.unlink(tmp_path)

@mcp.tool()
async def audit_requirements_url(url: str) -> str:
    """Audit Python packages from a requirements.txt file at a given URL.

    Args:
        url: URL to a requirements.txt file
        
    Returns:
        Report of vulnerabilities found with IDs, descriptions, and fix versions.
        
    Example: audit_requirements_url("https://raw.githubusercontent.com/django/django/main/requirements/py38.txt")
    """
    try:
        # Download the requirements file
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=30.0)
            response.raise_for_status()
            content = response.text
        
        # Create a temporary requirements file
        with tempfile.NamedTemporaryFile(mode='w+', delete=False, suffix='.txt') as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        try:
            # Run pip-audit against the temporary requirements file
            result = subprocess.run(
                ["pip-audit", "-r", tmp_path, "--format", "json"],
                capture_output=True,
                text=True,
                check=False  # Don't raise exception on non-zero exit code
            )
            
            # Parse the JSON output
            if result.stdout:
                try:
                    # Format the results in a user-friendly way
                    return format_audit_results(result.stdout)
                except json.JSONDecodeError:
                    # If JSON parsing fails, return the raw output
                    return result.stdout
            else:
                return f"Error running pip-audit: {result.stderr}"
        finally:
            # Clean up the temporary file
            os.unlink(tmp_path)
    except Exception as e:
        return f"Error: {str(e)}"

def format_audit_results(json_output: str) -> str:
    """Format pip-audit JSON output into a readable string."""
    try:
        data = json.loads(json_output)
        
        # Handle the new JSON structure which has a 'dependencies' key
        packages = data.get("dependencies", [])
        
        # Count vulnerabilities
        vulnerable_packages = 0
        total_vulnerabilities = 0
        
        for pkg in packages:
            if pkg.get("vulns") and len(pkg["vulns"]) > 0:
                vulnerable_packages += 1
                total_vulnerabilities += len(pkg["vulns"])
        
        if total_vulnerabilities == 0:
            return "No known vulnerabilities found in any packages"
        
        # Format the results
        result_lines = [f"Found {total_vulnerabilities} known vulnerabilities in {vulnerable_packages} package(s)"]
        
        for pkg in packages:
            name = pkg.get("name", "Unknown")
            version = pkg.get("version", "Unknown")
            vulns = pkg.get("vulns", [])
            
            if not vulns:
                continue
                
            for vuln in vulns:
                vuln_id = vuln.get("id", "Unknown")
                fix_versions = ", ".join(vuln.get("fix_versions", ["Not fixed"]))
                summary = vuln.get("description", "No details available")
                
                result_lines.append(f"{name}=={version} - Vulnerability: {vuln_id}")
                result_lines.append(f"  Summary: {summary}")
                result_lines.append(f"  Fixed in: {fix_versions}")
        
        return "\n".join(result_lines)
    except Exception as e:
        return f"Error parsing pip-audit output: {str(e)}\n\nRaw output: {json_output}"

if __name__ == "__main__":
    # Initialize and run the server
    print("Starting pyaudit server")
    mcp.run(transport='stdio')
