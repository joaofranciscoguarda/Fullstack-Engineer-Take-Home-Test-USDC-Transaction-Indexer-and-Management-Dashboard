"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getSearchInputType } from "@/lib/formatters";

interface WalletSearchProps {
	onSearch: (value: string, type: "address" | "txHash") => void;
	isLoading?: boolean;
}

export function WalletSearch({ onSearch, isLoading }: WalletSearchProps) {
	const [input, setInput] = useState("");
	const [error, setError] = useState("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!input.trim()) {
			setError("Please enter an address or transaction hash");
			return;
		}

		const inputType = getSearchInputType(input.trim());

		if (inputType === "invalid") {
			setError("Invalid Ethereum address or transaction hash");
			return;
		}

		setError("");
		onSearch(input.trim(), inputType);
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInput(e.target.value);
		if (error) setError("");
	};

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-2">
			<div className="flex gap-2">
				<div className="flex-1">
					<Input
						type="text"
						placeholder="Enter address (0x... 40 chars) or tx hash (0x... 64 chars)"
						value={input}
						onChange={handleChange}
						disabled={isLoading}
						className={`h-12 text-base ${error ? "border-red-500" : ""}`}
					/>
				</div>
				<Button type="submit" disabled={isLoading} className="h-12 px-6">
					<Search className="h-5 w-5 mr-2" />
					Search
				</Button>
			</div>
			{error && <p className="text-sm text-red-500">{error}</p>}
		</form>
	);
}
