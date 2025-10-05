"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { formatDate } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { api, type BalanceHistoryDataPoint } from "@/lib/api";

interface BalanceChartProps {
	walletAddress: string;
	chainId?: number;
}

interface ChartDataPoint {
	date: string;
	timestamp: number;
	balance: number;
	formattedBalance: string;
	formattedDate: string;
	direction: "incoming" | "outgoing";
}

export function BalanceChart({ walletAddress, chainId }: BalanceChartProps) {
	const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		const fetchBalanceHistory = async () => {
			setIsLoading(true);
			setError("");

			try {
				const response = await api.getBalanceHistory(walletAddress, {
					limit: 1000,
					chainId,
				});

				// Transform API data to chart format
				const transformed = response.data.history.map((point) => ({
					date: new Date(point.timestamp).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					}),
					timestamp: new Date(point.timestamp).getTime(),
					balance: parseFloat(point.balance_formatted),
					formattedBalance: point.balance_formatted,
					formattedDate: formatDate(point.timestamp),
					direction: point.direction,
				}));

				setChartData(transformed);
			} catch (err) {
				console.error("Error fetching balance history:", err);
				setError("Failed to load balance history");
			} finally {
				setIsLoading(false);
			}
		};

		if (walletAddress) {
			fetchBalanceHistory();
		}
	}, [walletAddress, chainId]);

	if (isLoading) {
		return (
			<Card className="w-full">
				<CardHeader>
					<Skeleton className="h-6 w-48" />
				</CardHeader>
				<CardContent>
					<Skeleton className="h-[300px] w-full" />
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className="w-full">
				<CardHeader>
					<CardTitle>Balance History</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-red-600">{error}</p>
				</CardContent>
			</Card>
		);
	}

	if (!chartData || chartData.length === 0) {
		return null;
	}

	// Calculate trend
	const firstBalance = chartData[0]?.balance || 0;
	const lastBalance = chartData[chartData.length - 1]?.balance || 0;
	const balanceChange = lastBalance - firstBalance;
	const percentChange =
		firstBalance !== 0 ? (balanceChange / firstBalance) * 100 : 0;

	const getTrendIcon = () => {
		if (balanceChange > 0)
			return <TrendingUp className="h-4 w-4 text-green-600" />;
		if (balanceChange < 0)
			return <TrendingDown className="h-4 w-4 text-red-600" />;
		return <Minus className="h-4 w-4 text-muted-foreground" />;
	};

	const getTrendColor = () => {
		if (balanceChange > 0) return "text-green-600";
		if (balanceChange < 0) return "text-red-600";
		return "text-muted-foreground";
	};

	const chartConfig = {
		balance: {
			label: "Balance",
			color: "hsl(var(--chart-1))",
		},
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<CardTitle className="text-lg font-semibold">
							Balance History
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							Based on {chartData.length} transaction
							{chartData.length !== 1 ? "s" : ""}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{getTrendIcon()}
						<div className="text-right">
							<p className={`text-sm font-semibold ${getTrendColor()}`}>
								{balanceChange > 0 ? "+" : ""}
								{balanceChange.toFixed(2)} USDC
							</p>
							<p className={`text-xs ${getTrendColor()}`}>
								{/* {percentChange > 0 ? "+" : ""}
								{percentChange.toFixed(1)}% */}
								index 0 to 1000
							</p>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<ChartContainer config={chartConfig} className="h-[300px] w-full">
					<AreaChart data={chartData}>
						<defs>
							<linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
								<stop
									offset="5%"
									stopColor="hsl(var(--chart-1))"
									stopOpacity={1}
								/>
								<stop
									offset="95%"
									stopColor="hsl(var(--chart-1))"
									stopOpacity={1}
								/>
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
						<XAxis
							dataKey="date"
							tick={{ fontSize: 12 }}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							tick={{ fontSize: 12 }}
							tickLine={false}
							axisLine={false}
							tickFormatter={(value) => `${value.toFixed(0)}`}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									labelFormatter={(_, payload) => {
										if (payload && payload[0]) {
											return payload[0].payload.formattedDate;
										}
										return "";
									}}
									formatter={(value, name, item) => {
										const direction = item.payload.direction;
										const directionText =
											direction === "incoming" ? "↓ Received" : "↑ Sent";
										return (
											<div className="flex flex-col gap-0.5">
												<span className="text-muted-foreground">
													{directionText}
												</span>
												<span className="font-mono font-semibold">
													{item.payload.formattedBalance} USDC
												</span>
											</div>
										);
									}}
								/>
							}
						/>
						<Area
							type="monotone"
							dataKey="balance"
							stroke="hsl(var(--chart-1))"
							strokeWidth={2}
							fillOpacity={1}
							fill="url(#colorBalance)"
						/>
					</AreaChart>
				</ChartContainer>
			</CardContent>
		</Card>
	);
}
