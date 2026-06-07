"""Knowledge graph visualization API routes."""

from fastapi import APIRouter, HTTPException

from ...core.graph import KnowledgeGraph
from ...db.database import DatabaseManager

router = APIRouter(prefix="/graph", tags=["graph"])
db = DatabaseManager()


@router.get("/{user_id}")
async def get_graph(user_id: str):
    """Get knowledge graph in D3.js JSON format for visualization."""
    try:
        graph = KnowledgeGraph(user_id, db)
        d3_data = graph.to_d3_json()
        return d3_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))