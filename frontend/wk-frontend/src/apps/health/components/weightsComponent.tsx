import { useState, useEffect } from "react";
import { postWeight, getWeights } from "../api/weights";
import { DisplayChart, type Vector2 } from "@/core/components/chartComponents";

export function DisplayWeightsChart() {
    const [graphData, setGraphData] = useState<Vector2[]>([]);
    const [createWeightModalOpen, setCreateWeightModalOpen] = useState(false);

    const [weightDate, setWeightDate] = useState<string>("");
    const [weightInKg, setWeightInKg] = useState<string>("");

    useEffect(() => {
        void loadWeights();
    }, []);

    const loadWeights = async () => {
        const days7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const weights = await getWeights(days7, null);
        setGraphData(weights.map((w) => ({ x: new Date(w.measuredAtUtc).getTime(), y: w.weightInKilograms })));
    };

    const openCreateWeightModal = () => {
        setCreateWeightModalOpen(true);
    };

    const addWeight = async () => {
        await postWeight({
            measuredAtUtc: new Date(weightDate),
            weightInKilograms: Number(weightInKg),
        });
        void loadWeights();
        setCreateWeightModalOpen(false);
    };

    return (
        <div>
            <h2>Weights</h2>
            <div>
                <DisplayChart data={graphData} xLabel="Date" yLabel="Weight"/>
            </div>
            <button className="ui-btn ui-btn--primary" onClick={openCreateWeightModal}>Create</button>
            {createWeightModalOpen && (
                <div className="ui-modal">
                    <h2>Create Weight</h2>
                    <input className="ui-input" type="date" value={weightDate} onChange={(e) => setWeightDate(e.target.value)} />
                    <input className="ui-input" type="string" value={weightInKg} onChange={(e) => setWeightInKg(e.target.value)} />
                    <button className="ui-btn ui-btn--primary" onClick={addWeight}>Create</button>
                </div>
            )}
        </div>
    );
}