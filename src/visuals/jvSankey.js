'use strict';
var jvCharts = require('../jvCharts.js');

jvCharts.prototype.sankey = {
    paint: paint,
    setData: setData
}

jvCharts.prototype.generateSankey = generateSankey;

/************************************************ Sankey functions ******************************************************/
    /**
     *
     * @param data
     * @param dataTable
     * @param colors
     */
function setData(chart) {
    var sankeyData = {},
        data = chart.data.chartData,
        dataTable = chart.data.dataTable;

    sankeyData.links = [];
    sankeyData.nodes = [];

    //Iterate through sources and targets to make a node list
    var nodeList = [];
    for (var item in dataTable) {
        if (item === "value") { continue; };
        for (var i = 0; i < data.length; i++) {
            var potentialNode = data[i][dataTable[item]];
            var addToList = true;
            for (var j = 0; j < nodeList.length; j++) {
                if (potentialNode === nodeList[j]) {
                    addToList = false;
                    break;
                }
            }
            if (addToList) {
                nodeList.push(potentialNode);
            }
        }
    }
    //Create nodes object
    for (var i = 0; i < nodeList.length; i++) {
        sankeyData.nodes.push({
            "name": nodeList[i]
        });
    }

    sankeyData.links = data.map(function (x) {
        return {
            "source": x[dataTable.start],
            "target": x[dataTable.end],
            "value": x[dataTable.value]
        }
    });

    var nodeMap = {};
    for (var i = 0; i < sankeyData.nodes.length; i++) {
        sankeyData.nodes[i].node = i;
        nodeMap[sankeyData.nodes[i].name] = i;
    }
    sankeyData.links = sankeyData.links.map(function (x) {
        return {
            source: nodeMap[x.source],
            target: nodeMap[x.target],
            value: x.value
        };
    });

    chart.data.chartData = sankeyData;
    chart.data.color = d3.scaleOrdinal(d3.schemeCategory20);
}

function paint(chart) {
    var data = chart.data.chartData;

    //generate SVG
    chart.generateSVG();
    chart.generateSankey(data);
}

/**
 * Generates a sankey chart with the given data
 * @param sankeyData
 */
function generateSankey(sankeyData) {
    var chart = this,
        svg = chart.svg,
        color = chart.options.color;

    var width = chart.config.container.width;
    var height = chart.config.container.height;

    var formatNumber = d3.format(",.0f"),    // zero decimal places
        format = function (d) { return formatNumber(d) + " " + "Widgets"; },
        color = d3.scaleOrdinal(d3.schemeCategory20);

    //var nodeMap = {};
    //for (var i = 0; i < sankeyData.nodes.length; i++) {
    //    sankeyData.nodes[i].node = i;
    //    nodeMap[sankeyData.nodes[i].name] = i;
    //}
    //sankeyData.links = sankeyData.links.map(function(x){
    //    return {
    //        source: nodeMap[x.source],
    //        target: nodeMap[x.target],
    //        value: x.value
    //    };
    //});

    var sankey = d3.sankey()
        .nodeWidth(10)
        .nodePadding(15)
        .size([width, height]);

    var path = sankey.link();

    // //Adding zoom v4 behavior to sankey
    d3.selectAll("svg")
        .call(d3.zoom()
            .scaleExtent([.1, 10])
            .on("zoom", zoom));//zoom event listener

    sankey
        .nodes(sankeyData.nodes)
        .links(sankeyData.links)
        .layout(32);

    var link = svg.append("g").selectAll(".sankey-link")
        .data(sankeyData.links)
        .enter()
        .append("path")
        .filter(function (d) { return d.value > 0; })
        .attr("class", "sankey-link")
        .attr("d", path)
        .style("stroke-width", function (d) {
            return Math.max(1, d.dy);
        })
        .sort(function (a, b) {
            return b.dy - a.dy;
        })
        .on("mouseover", function (d, i) {
            if (chart.draw.showToolTip) {
                var tipData = chart.setTipData(d, i);
                chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
            }
        })
        .on("mousemove", function (d, i) {
            if (chart.draw.showToolTip) {
                chart.tip.hideTip();
                var tipData = chart.setTipData(d, i);
                chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
            }
        })
        .on("mouseout", function (d, i) {
            if (chart.draw.showToolTip) {
                chart.tip.hideTip();
            }
        });

    var node = svg.append("g").selectAll(".node")
        .data(sankeyData.nodes)
        .enter()
        .append("g")
        .filter(function (d) { return d.value > 0; })
        .attr("class", "node")
        .attr("transform", function (d) {
            return "translate(" + d.x + ", " + d.y + ")";
        })
        .call(d3.drag()
            .subject(function (d) {
                return d;
            })
            .on("start", function (d) {
                d3.event.sourceEvent.stopPropagation();
                this.parentNode.appendChild(this);
            })
            .on("drag", dragmove));

    node.append("rect")
        .attr("height", function (d) {
            return Math.max(d.dy, 0);
        })
        .attr("width", sankey.nodeWidth())
        .style("fill", function (d) {
            return d.color = color(d.name);
        })
        .style("stroke", function (d) {
            return d3.rgb(d.color).darker(2);
        });

    node.append("text")
        .attr("x", -6)
        .attr("y", function (d) {
            return d.dy / 2;
        })
        .attr("dy", ".35em")
        .attr("text-anchor", "end")
        .attr("transform", null)
        .attr("transform", null)
        .text(function (d) {
            return d.name;
        })
        .filter(function (d) {
            return d.x < width / 2;
        })
        .attr("x", 6 + sankey.nodeWidth())
        .attr("text-anchor", "start");

    function dragmove(d) {
        d3.select(this).attr("transform",
            "translate(" + (
                d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))
            ) + "," + (
                d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))
            ) + ")");
        sankey.relayout();
        link.attr("d", path);
    }

    function zoom() { //Implementing the v4 zooming feature
        svg.attr("transform", d3.event.transform);
    }
}

module.exports = jvCharts;
