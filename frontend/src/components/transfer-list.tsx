"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ArrowUpRight,
	ArrowDownLeft,
	ExternalLink,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import {
	formatUSDC,
	formatAddress,
	formatRelativeTime,
	getEtherscanLink,
} from "@/lib/formatters";
import type { Transfer, PaginationMetadata } from "@/lib/api";

interface TransferListProps {
	transfers: Transfer[];
	isLoading: boolean;
	walletAddress: string;
	pagination?: PaginationMetadata;
	onPageChange?: (page: number) => void;
}

export function TransferList({
	transfers,
	isLoading,
	walletAddress,
	pagination,
	onPageChange,
}: TransferListProps) {
	if (isLoading) {
		return (
			<Card className="w-full">
				<CardHeader>
					<Skeleton className="h-6 w-32" />
				</CardHeader>
				<CardContent className="space-y-3">
					{[1, 2, 3, 4, 5].map((i) => (
						<Skeleton key={i} className="h-20 w-full" />
					))}
				</CardContent>
			</Card>
		);
	}

	if (!transfers || (transfers.length === 0 && !isLoading)) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle>Transaction History</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<p className="text-muted-foreground">No transactions found</p>
						<p className="text-sm text-muted-foreground mt-1">
							This address has no USDC transfer history
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Transaction History</CardTitle>
					{pagination && (
						<Badge variant="secondary" className="text-xs">
							{pagination.total_items} total
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{transfers ? (
					transfers.map((transfer) => {
						const isOutgoing =
							transfer.from_address.toLowerCase() ===
							walletAddress.toLowerCase();
						const otherAddress = isOutgoing
							? transfer.to_address
							: transfer.from_address;

						return (
							<div
								key={transfer.id}
								className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
								{/* Icon */}
								<div
									className={`p-2 rounded-full ${
										isOutgoing
											? "bg-red-100 dark:bg-red-900/20"
											: "bg-green-100 dark:bg-green-900/20"
									}`}>
									{isOutgoing ? (
										<ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
									) : (
										<ArrowDownLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
									)}
								</div>

								{/* Content */}
								<div className="flex-1 min-w-0 space-y-1">
									<div className="flex items-start justify-between gap-2">
										<div className="space-y-0.5">
											<p className="text-sm font-medium">
												{isOutgoing ? "Sent to" : "Received from"}
											</p>
											<code className="text-xs text-muted-foreground font-mono">
												{formatAddress(otherAddress, 6)}
											</code>
										</div>
										<div className="text-right space-y-0.5">
											<p
												className={`text-sm font-semibold ${
													isOutgoing
														? "text-red-600 dark:text-red-400"
														: "text-green-600 dark:text-green-400"
												}`}>
												{isOutgoing ? "-" : "+"}
												{formatUSDC(transfer.amount.toString())} USDC
											</p>
											<p className="text-xs text-muted-foreground">
												{formatRelativeTime(transfer.timestamp)}
											</p>
										</div>
									</div>

									{/* Transaction Details */}
									<div className="flex items-center gap-2 pt-1">
										<Badge variant="outline" className="text-xs">
											Block {transfer.block_number.toLocaleString()}
										</Badge>
										<a
											href={getEtherscanLink(
												"tx",
												transfer.tx_hash,
												transfer.chain_id
											)}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
											<span className="font-mono">
												{formatAddress(transfer.tx_hash, 4)}
											</span>
											<ExternalLink className="h-3 w-3" />
										</a>
									</div>
								</div>
							</div>
						);
					})
				) : (
					<div className="flex items-center justify-center py-8 text-center">
						<p className="text-muted-foreground">No transactions found</p>
						<p className="text-sm text-muted-foreground mt-1">
							This address has no USDC transfer history, or something went wrong
						</p>
					</div>
				)}

				{/* Pagination */}
				{pagination && pagination.max_page_number > 1 && (
					<div className="flex items-center justify-between pt-4 border-t">
						<p className="text-sm text-muted-foreground">
							Page {pagination.page_number} of {pagination.max_page_number}
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={!(pagination.page_number > 1)}
								onClick={() => onPageChange?.(pagination.page_number - 1)}>
								<ChevronLeft className="h-4 w-4 mr-1" />
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={
									!(pagination.page_number < pagination.max_page_number)
								}
								onClick={() => onPageChange?.(pagination.page_number + 1)}>
								Next
								<ChevronRight className="h-4 w-4 ml-1" />
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
