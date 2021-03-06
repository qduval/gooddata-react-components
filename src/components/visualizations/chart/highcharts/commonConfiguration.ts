// (C) 2007-2018 GoodData Corporation
import cloneDeep = require('lodash/cloneDeep');
import invoke = require('lodash/invoke');
import get = require('lodash/get');
import set = require('lodash/set');
import isEmpty = require('lodash/isEmpty');
import { chartClick } from '../../utils/drilldownEventing';
import { styleVariables } from '../../styles/variables';
import handleChartLoad from '../events/load';
import { isOneOfTypes } from '../../utils/common';
import { supportedDualAxesChartTypes } from '../chartOptionsBuilder';

const isTouchDevice = 'ontouchstart' in window || navigator.msMaxTouchPoints;

export const DEFAULT_SERIES_LIMIT = 1000;
export const DEFAULT_CATEGORIES_LIMIT = 365;
export const DEFAULT_DATA_POINTS_LIMIT = 2000;
export const MAX_POINT_WIDTH = 100;
export const HOVER_BRIGHTNESS = 0.1;
export const MINIMUM_HC_SAFE_BRIGHTNESS = Number.MIN_VALUE;

let previousChart: any = null;

const BASE_TEMPLATE: any = {
    credits: {
        enabled: false
    },
    title: {
        // setting title to empty string prevents it from being shown
        text: ''
    },
    series: [],
    legend: {
        enabled: false
    },
    drilldown: {
        activeDataLabelStyle: {
            textDecoration: 'none'
        },
        activeAxisLabelStyle: {
            color: styleVariables.gdColorText,
            textDecoration: 'none'
        },
        drillUpButton: {
            theme: {
                style: {
                    // https://forum.highcharts.com/highcharts-usage/empty-checkbox-
                    // after-drilldown-with-x-axis-label-t33414/
                    display: 'none'
                }
            }
        }
    },
    plotOptions: {
        series: {
            animation: false,
            enableMouseTracking: true, // !Status.exportMode,
            turboThreshold: DEFAULT_CATEGORIES_LIMIT,
            events: {
                legendItemClick() {
                    if (this.visible) {
                        this.points.forEach((point: any) => point.dataLabel && point.dataLabel.hide());
                    }
                }
            },
            point: {
                events: {
                    click() {
                        if (isTouchDevice) {
                            // Close opened tooltip on previous clicked chart
                            // (click between multiple charts on dashboards)
                            const currentChart = this.series.chart;
                            const currentId = get(currentChart, 'container.id');
                            const prevId = get(previousChart, 'container.id');
                            const previousChartDisconnected = isEmpty(previousChart);
                            if (previousChart && !previousChartDisconnected && prevId !== currentId) {
                                // Remove line chart point bubble
                                invoke(previousChart, 'hoverSeries.onMouseOut');
                                previousChart.tooltip.hide();
                            }

                            if (!previousChart || prevId !== currentId) {
                                previousChart = currentChart;
                            }
                        }
                    }
                }
            }
        }
    },
    chart: {
        animation: false,
        style: {
            fontFamily: 'Avenir, "Helvetica Neue", Arial, sans-serif'
        }
    }
};

function registerDrilldownHandler(configuration: any, chartOptions: any, drillConfig: any) {
    set(configuration, 'chart.events.drilldown', function chartDrilldownHandler(event: any) {
        chartClick(drillConfig, event, this.container, chartOptions.type);
    });

    return configuration;
}

function registerLoadHandler(configuration: any, chartOptions: any) {
    if (isOneOfTypes(chartOptions.type, supportedDualAxesChartTypes)) {
        set(configuration, 'chart.events.load', handleChartLoad);
    }
    return configuration;
}

export function getCommonConfiguration(chartOptions: any, drillConfig: any) {
    const commonConfiguration = cloneDeep(BASE_TEMPLATE);
    const handlers = [
        registerDrilldownHandler,
        registerLoadHandler
    ];

    return handlers.reduce(
        (configuration, handler) => handler(configuration, chartOptions, drillConfig),
        commonConfiguration
    );
}
