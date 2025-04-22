import plotly.graph_objects as go
from pathlib import Path
import os
import json
from datetime import datetime
from typing import Dict, List, Union
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("graph_plotter")

@mcp.tool()
async def plot_time_series(
    timestamps: List[str],
    values: List[float],
    output_path: str,
    title: str = "Time Series Plot",
    xaxis_title: str = "Time",
    yaxis_title: str = "Value",
    series_name: str = "Data"
) -> str:
    """
    Plots time series data and saves it as an interactive HTML file.
    
    Args:
        timestamps: List of YYYY-MM-DD formatted date strings
        values: List of float values for y-axis
        output_path: Where to save the plot (default: `/agent_home/<plot>.html`)
        title: Plot title (default: "Time Series Plot")
        xaxis_title: X-axis label (default: "Time")
        yaxis_title: Y-axis label (default: "Value")
        series_name: Name for the data series (default: "Data")
        
    Returns:
        The absolute path where the plot was saved
    """
    # Validate input lengths match
    if len(timestamps) != len(values):
        raise ValueError("Timestamps and values must be the same length")
    
    # Convert string timestamps to datetime objects
    try:
        datetime_timestamps = [datetime.strptime(ts, "%Y-%m-%d") for ts in timestamps]
    except ValueError as e:
        raise ValueError(f"Invalid date format. All dates must be YYYY-MM-DD: {str(e)}")
    
    # Create figure
    fig = go.Figure()
    
    # Add the single data series
    fig.add_trace(go.Scatter(
        x=datetime_timestamps,
        y=values,
        name=series_name,
        mode='lines+markers'
    ))
    
    # Update layout
    fig.update_layout(
        title=title,
        xaxis_title=xaxis_title,
        yaxis_title=yaxis_title,
        hovermode="x"
    )
    
    # Ensure output directory exists
    path = Path(output_path)
    os.makedirs(path.parent, exist_ok=True)
    
    # Save plot
    fig.write_html(path)
    return str(path.absolute())

if __name__ == "__main__":
    mcp.run(transport='stdio')
