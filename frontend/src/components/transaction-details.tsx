"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Copy,
	ExternalLink,
	ArrowRight,
	CheckCircle2,
	XCircle,
	Clock,
} from "lucide-react";
import {
	formatUSDC,
	formatAddress,
	formatDate,
	formatRelativeTime,
	copyToClipboard,
	getEtherscanLink,
	formatEther,
} from "@/lib/formatters";
import { useState } from "react";
import type { Transfer } from "@/lib/api";

interface TransactionDetailsProps {
	transaction: Transfer | null;
	isLoading: boolean;
	txHash: string;
}

export function TransactionDetails({
	transaction,
	isLoading,
	txHash,
}: TransactionDetailsProps) {
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const handleCopy = async (text: string, field: string) => {
		const success = await copyToClipboard(text);
		if (success) {
			setCopiedField(field);
			setTimeout(() => setCopiedField(null), 2000);
		}
	};

	if (isLoading) {
		return (
			<Card className="w-full">
				<CardHeader>
					<Skeleton className="h-6 w-48" />
				</CardHeader>
				<CardContent className="space-y-4">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-16 w-full" />
					))}
				</CardContent>
			</Card>
		);
	}

	if (!transaction) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle>Transaction Not Found</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">
						No transaction found with this hash.
					</p>
				</CardContent>
			</Card>
		);
	}

	const statusIcon = transaction.is_confirmed ? (
		<CheckCircle2 className="h-4 w-4 text-green-600" />
	) : (
		<Clock className="h-4 w-4 text-yellow-600" />
	);

	const chainName =
		transaction.chain_id === 1 ? "Ethereum" : `Chain ${transaction.chain_id}`;

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="text-lg font-semibold">
							Transaction Details
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{formatRelativeTime(transaction.timestamp)}
						</p>
					</div>
					<div className="flex gap-2">
						<Badge variant="secondary" className="text-xs">
							{chainName}
						</Badge>
						<Badge
							variant="outline"
							className="text-xs flex items-center gap-2">
							{statusIcon}
							{transaction.is_confirmed ? "Confirmed" : "Pending"}
						</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Transaction Hash */}
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Transaction Hash</p>
					<div className="flex items-center gap-2">
						<code className="flex-1 text-sm font-mono bg-muted px-3 py-2 rounded-md break-all">
							{formatAddress(transaction.tx_hash, 8)}
						</code>
						<button
							onClick={() => handleCopy(transaction.tx_hash, "txHash")}
							className="p-2 hover:bg-muted rounded-md transition-colors"
							title="Copy transaction hash">
							<Copy className="h-4 w-4" />
						</button>
						<a
							href={getEtherscanLink(
								"tx",
								transaction.tx_hash,
								transaction.chain_id
							)}
							target="_blank"
							rel="noopener noreferrer"
							className="p-2 hover:bg-muted rounded-md transition-colors"
							title="View on Etherscan">
							<ExternalLink className="h-4 w-4" />
						</a>
					</div>
					{copiedField === "txHash" && (
						<p className="text-xs text-green-600">Copied!</p>
					)}
				</div>

				{/* Amount */}
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Amount</p>
					<div className="flex items-baseline gap-2">
						<span className="text-3xl font-bold">
							{formatUSDC(transaction.amount)}
						</span>
						<span className="text-xl text-muted-foreground">USDC</span>
					</div>
				</div>

				{/* Transfer Direction */}
				<div className="space-y-2">
					<p className="text-xs text-muted-foreground">Transfer</p>
					<div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
						<div className="flex-1 space-y-1">
							<p className="text-xs font-medium">From</p>
							<div className="flex items-center gap-2">
								<code className="text-sm font-mono">
									{formatAddress(transaction.from_address, 6)}
								</code>
								<button
									onClick={() =>
										handleCopy(transaction.from_address, "fromAddress")
									}
									className="p-1 hover:bg-background rounded transition-colors"
									title="Copy from address">
									<Copy className="h-3 w-3" />
								</button>
								<a
									href={getEtherscanLink(
										"address",
										transaction.from_address,
										transaction.chain_id
									)}
									target="_blank"
									rel="noopener noreferrer"
									className="p-1 hover:bg-background rounded transition-colors"
									title="View on Etherscan">
									<ExternalLink className="h-3 w-3" />
								</a>
							</div>
							{copiedField === "fromAddress" && (
								<p className="text-xs text-green-600">Copied!</p>
							)}
						</div>

						<ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

						<div className="flex-1 space-y-1">
							<p className="text-xs font-medium">To</p>
							<div className="flex items-center gap-2">
								<code className="text-sm font-mono">
									{formatAddress(transaction.to_address, 6)}
								</code>
								<button
									onClick={() =>
										handleCopy(transaction.to_address, "toAddress")
									}
									className="p-1 hover:bg-background rounded transition-colors"
									title="Copy to address">
									<Copy className="h-3 w-3" />
								</button>
								<a
									href={getEtherscanLink(
										"address",
										transaction.to_address,
										transaction.chain_id
									)}
									target="_blank"
									rel="noopener noreferrer"
									className="p-1 hover:bg-background rounded transition-colors"
									title="View on Etherscan">
									<ExternalLink className="h-3 w-3" />
								</a>
							</div>
							{copiedField === "toAddress" && (
								<p className="text-xs text-green-600">Copied!</p>
							)}
						</div>
					</div>
				</div>

				{/* Block Information */}
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Block Number</p>
						<p className="text-sm font-mono">
							{transaction.block_number.toLocaleString()}
						</p>
					</div>
					<div className="space-y-1">
						<p className="text-xs text-muted-foreground">Confirmations</p>
						<p className="text-sm font-mono">{transaction.confirmations}</p>
					</div>
				</div>

				{/* Block Hash */}
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Block Hash</p>
					<div className="flex items-center gap-2">
						<code className="flex-1 text-xs font-mono bg-muted px-3 py-2 rounded-md break-all">
							{formatAddress(transaction.block_hash, 6)}
						</code>
						<button
							onClick={() => handleCopy(transaction.block_hash, "blockHash")}
							className="p-2 hover:bg-muted rounded-md transition-colors"
							title="Copy block hash">
							<Copy className="h-3 w-3" />
						</button>
					</div>
					{copiedField === "blockHash" && (
						<p className="text-xs text-green-600">Copied!</p>
					)}
				</div>

				{/* Gas Information */}
				{(transaction.gas_price || transaction.gas_used) && (
					<div className="grid grid-cols-2 gap-4">
						{transaction.gas_price && (
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">Gas Price</p>
								<p className="text-sm font-mono">
									{formatEther(transaction.gas_price)} ETH
								</p>
							</div>
						)}
						{transaction.gas_used && (
							<div className="space-y-1">
								<p className="text-xs text-muted-foreground">Gas Used</p>
								<p className="text-sm font-mono">
									{transaction.gas_used.toLocaleString()}
								</p>
							</div>
						)}
					</div>
				)}

				{/* Timestamp */}
				<div className="pt-2 border-t">
					<p className="text-xs text-muted-foreground">
						{formatDate(transaction.timestamp)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
