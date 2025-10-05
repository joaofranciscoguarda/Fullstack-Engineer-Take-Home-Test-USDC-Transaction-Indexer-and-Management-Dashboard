"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink } from "lucide-react";
import {
	formatUSDC,
	formatAddress,
	copyToClipboard,
	getEtherscanLink,
} from "@/lib/formatters";
import { useState } from "react";
import type { BalanceResponse } from "@/lib/api";

interface WalletBalanceProps {
	balance: BalanceResponse | null;
	isLoading: boolean;
	address: string;
}

export function WalletBalance({
	balance,
	isLoading,
	address,
}: WalletBalanceProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		const success = await copyToClipboard(address);
		if (success) {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	if (isLoading) {
		return (
			<Card className="w-full">
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-8 w-48" />
				</CardContent>
			</Card>
		);
	}

	if (!balance) {
		return null;
	}

	const chainName =
		balance.data.chainId === 1 ? "Ethereum" : `Chain ${balance.data.chainId}`;

	return (
		<Card className="w-full">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<CardTitle className="text-lg font-semibold">
						Wallet Balance
					</CardTitle>
					<Badge variant="secondary" className="text-xs">
						{chainName}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Address */}
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Address</p>
					<div className="flex items-center gap-2">
						<code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded-md break-all">
							{formatAddress(address, 6)}
						</code>
						<button
							onClick={handleCopy}
							className="p-2 hover:bg-muted rounded-md transition-colors"
							title="Copy address">
							<Copy className="h-4 w-4" />
						</button>
						<a
							href={getEtherscanLink("address", address, balance.data.chainId)}
							target="_blank"
							rel="noopener noreferrer"
							className="p-2 hover:bg-muted rounded-md transition-colors"
							title="View on Etherscan">
							<ExternalLink className="h-4 w-4" />
						</a>
					</div>
					{copied && <p className="text-xs text-green-600">Copied!</p>}
				</div>

				{/* Balance */}
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">USDC Balance</p>
					<div className="flex items-baseline gap-2">
						<span className="text-4xl font-bold">{balance.data.formatted}</span>
						<span className="text-xl text-muted-foreground">USDC</span>
					</div>
				</div>

				{/* Last Updated */}
				<div className="pt-2 border-t">
					<p className="text-xs text-muted-foreground">
						Last updated: {new Date(balance.data.lastUpdated).toLocaleString()}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
