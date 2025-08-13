'use client';
import { useState, useEffect } from "react";

export default function NameInput({ onSubmit }: { onSubmit: (name: string) => void }) {
    const [name, setName] = useState("");

    useEffect(() => {
        const saved = sessionStorage.getItem("playerName");
        if (saved) onSubmit(saved);
    }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name) return;
        sessionStorage.setItem("playerName", name);
        onSubmit(name);
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col items-center">
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Input Nick Name"
                className="p-2 border rounded mb-2"
            />
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                Begin
            </button>
        </form>
    );
}
