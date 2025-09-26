// Main entry point for Envio indexer
// This file would typically be the main entry point for the Envio indexer

import { handleCrossChainCompleted, handleCrossChainFailed, handleCrossChainInitiated, handleCrossChainPending } from "./handlers/crosschain";
import { handleLiquidityAdded, handleLiquidityRemoved, handlePoolCreated, handlePoolUpdated, handleSwapExecuted } from "./handlers/dex";
import { handleErrorReport, handleHealthCheck, handlePerformanceUpdate, handleStatusUpdate } from "./handlers/health";
import { handleMarketDataUpdated, handlePriceUpdated, handleVolatilityUpdated, handleVolumeUpdated } from "./handlers/market";
import { handlePermissionChanged, handlePermissionGranted, handlePermissionRevoked, handlePermissionUpdated } from "./handlers/permissions";
import { handlePortfolioCreated, handlePortfolioDeleted, handlePortfolioRebalanced, handlePortfolioUpdated } from "./handlers/portfolio";
import { handleHealthUpdated, handleMetricsUpdated, handlePerformanceUpdated, handleStatsUpdated } from "./handlers/stats";
import { handleTradeCompleted, handleTradeExecuted, handleTradeFailed, handleTradePending } from "./handlers/trades";

// Export all handlers
export {
    handleCrossChainCompleted,
    handleCrossChainFailed, handleCrossChainInitiated, handleCrossChainPending, handleErrorReport, handleHealthCheck, handleHealthUpdated, handleLiquidityAdded,
    handleLiquidityRemoved, handleMarketDataUpdated, handleMetricsUpdated, handlePerformanceUpdate, handlePerformanceUpdated, handlePermissionChanged,
    handlePermissionGranted,
    handlePermissionRevoked,
    handlePermissionUpdated, handlePoolCreated,
    handlePoolUpdated, handlePortfolioCreated, handlePortfolioDeleted, handlePortfolioRebalanced, handlePortfolioUpdated, handlePriceUpdated, handleStatsUpdated, handleStatusUpdate, handleSwapExecuted, handleTradeCompleted, handleTradeExecuted,
    handleTradeFailed,
    handleTradePending, handleVolatilityUpdated, handleVolumeUpdated
};

