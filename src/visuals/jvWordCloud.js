'use strict';
var jvCharts = require('../jvCharts.js');

jvCharts.prototype.cloud = {
    paint: paint,
    setData: setData
};

jvCharts.prototype.generateCloud = generateCloud;

/************************************************ Cloud functions ******************************************************/

/**setCloudData
 *  gets cloud data and adds it to the chart object
 *
 * @params data, dataTable, colors
 */
function setData(chart) {
    //define color object for chartData
    chart.data.color = chart.colors;
};

/**setCloudLegendData
 *  gets legend info from chart Data
 *
 * @params data, type
 * @returns [] of legend text
 */
function setCloudLegendData(data) {
    var legendArray = [];
    for (var i = 0; i < data.chartData.children.length; i++) {
        if (legendArray.indexOf(data.chartData.children[i][data.dataTable.series]) == -1) {
            legendArray.push((data.chartData.children[i][data.dataTable.series]));
        }
    }
    return legendArray;
}

function paint(chart) {
    chart.options.color = chart.data.color;
    chart.currentData = chart.data;//Might have to move into method bc of reference/value relationship

    var cloudMargins = {
        top: 15,
        right: 15,
        left: 15,
        bottom: 15
    };

    //Generate SVG-legend data is used to determine the size of the bottom margin (set to null for no legend)
    chart.generateSVG(null, cloudMargins);
    // chart.generateLegend(chart.currentData.legendData, 'generateCloud');
    chart.generateCloud(chart.currentData);
};

/** generateCloud
 *
 * paints the cloud  on the chart
 * @params cloud Data
 */
function generateCloud(cloudData) {
    var chart = this,
        svg = chart.svg,
        container = chart.config.container,
        allFilterList = [],
        relationMap = chart.data.dataTable,
        chartName = chart.config.name,
        width = container.width,
        height = container.height,
        margin = chart.config.margin,
        min,
        max;


    var categories = d3.keys(d3.nest().key(function (d) {
        if (!min && !max) {
            min = d[relationMap.value];
            max = d[relationMap.value];
        } else {
            if (d[relationMap.value] > max) {
                max = d[relationMap.value];
            }
            if (d[relationMap.value] < min) {
                min = d[relationMap.value];
            }
        }
        return d[relationMap.value];
    }).map(cloudData.chartData));

    var color = d3.scaleOrdinal()
        .range(chart.data.color
            .map(function (c) { c = d3.rgb(c); c.opacity = 0.8; return c; }));

    var fontSize = d3.scalePow().exponent(5).domain([0, 1]).range([10, 80]);

    var layout = d3.layout.cloud()
        .timeInterval(10)
        .size([width, height])
        .words(cloudData.chartData)
        .rotate(function (d) { return 0; })
        .font('Roboto')
        .fontSize(function (d, i) {
            return fontSize(max - min !== 0 ? (d[relationMap.value] - min) / (max - min) : 0);
        })
        .text(function (d) { return d[relationMap.label]; })
        .spiral("archimedean")
        .on("end", draw)
        .start();

    var wordcloud = svg.append("g")
        .attr('class', 'wordcloud')
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    function draw(words) {
        wordcloud.selectAll("text")
            .data(cloudData.chartData)
            .enter().append("text")
            .attr('class', 'word')
            .style("font-size", function (d) {
                return d.size + "px";
            })
            .style("font-family", function (d) {
                return d.font;
            })
            .style("fill", function (d) {
                return color(d[relationMap.value]);
            })
            .attr("text-anchor", "middle")
            .attr("transform", function (d) { return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")"; })
            .text(function (d) { return d.text; })
            .on("mouseover", function (d, i) {
                //Get tip data
                var tipData = chart.setTipData(d, i);
                tipData.color = color(d[relationMap.value]);

                //Draw tip
                chart.tip.generateSimpleTip(tipData, chart.data.dataTable, d3.event);
            })
            .on("mouseout", function (d) {
                chart.tip.hideTip();
            });
    }

};

module.exports = jvCharts;
