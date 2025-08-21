'use client';
import ReactSpeedometer from 'react-d3-speedometer';

export default function TPSGauge({
    tps,
    maxTPS = 100,
    width = 250,
}: {
    tps: number;
    maxTPS?: number;
    width?: number;
}) {
    // Giới hạn để kim không vượt quá max
    const value = Math.min(Math.max(tps, 0), maxTPS);

    return (
        <div className="w-full max-w-lg">
            <ReactSpeedometer
                startColor='#33CC33'
                endColor='#FF471A'
                value={value}
                minValue={0}
                maxValue={maxTPS}
                maxSegmentLabels={0}
                width={width}
                height={185}
                segments={100}
                textColor="#0099cc"
                currentValueText={`${tps}`}
                needleTransitionDuration={800}
            />
        </div>
    );
}
