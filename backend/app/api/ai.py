from fastapi import APIRouter
from typing import List
from app.ai.anomaly_service import anomaly_service
from app.ai.prediction_service import prediction_service
from app.ai.diagnosis_service import diagnosis_service
from app.models.schemas import AnomalyOut, PredictionOut, AiDiagnosisRequest, AiDiagnosisResponse

router = APIRouter(prefix="/ai", tags=["AIOps Intelligence"])

@router.get("/anomalies", response_model=List[AnomalyOut])
def get_detected_anomalies():
    """Returns real-time detected statistical and ML telemetry anomalies."""
    return anomaly_service.detect_metric_anomalies()

@router.get("/predictions", response_model=List[PredictionOut])
def get_resource_predictions():
    """Returns linear regression capacity exhaustion forecasts."""
    return prediction_service.get_resource_predictions()

@router.post("/diagnosis", response_model=AiDiagnosisResponse)
def generate_ai_diagnosis(req: AiDiagnosisRequest):
    """Executes root-cause correlation and queries Ollama or grounded statistical AI."""
    title = req.context_notes or "Telemetry Anomaly Evaluation"
    return diagnosis_service.generate_diagnosis(incident_title=title, context_notes=req.context_notes)

