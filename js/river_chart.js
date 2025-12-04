let riverChartDrawn = false;

function drawRiverChart() {
    if (riverChartDrawn) return;
    riverChartDrawn = true;
    
    const container = document.getElementById('riverChart');
    if (!container) {
        console.error("riverChart container not found!");
        return;
    }

    const margin = { top: 20, right: 30, bottom: 120, left: 70 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = container.clientHeight - margin.top - margin.bottom;

    // load data
    d3.text("data/river_data.csv").then(rawText => {
        const rows = d3.csvParseRows(rawText);
        // Parse rows
        let parsedData = rows.slice(6).map(row => {
            let yearStr = row[2];
            let flowStr = row[22];

            //Remove commas
            if (yearStr) yearStr = yearStr.toString().replace(/,/g, '');
            if (flowStr) flowStr = flowStr.toString().replace(/,/g, '');

            //Conv
            const year = +yearStr;
            const flowAcFt = +flowStr;
            return {
                year: year,
                flow: flowAcFt / 1000000
            };
        });


        // calc 10y moving avg
        parsedData.forEach((d, i, arr) => {
            if (i < 9) {
                d.ma = null;
            } else {
                let sum = 0;
                for (let j = 0; j < 10; j++) {
                    sum += arr[i - j].flow;
                }
                d.ma = sum / 10;
            }
        });

        // Filter bad data
        parsedData = parsedData.filter(d => d.year > 1915 && !isNaN(d.flow));

        //draw chart
        createD3Chart(parsedData, width, height, margin);
    }).catch(error => {
        console.error("Error loading CSV:", error);
    });
}

    function createD3Chart(data, width, height, margin) {
        d3.select("#riverChart").selectAll("*").remove();

        const svg = d3.select("#riverChart")
            .append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // scale
        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.year))
            .range([0, width]);
        const y = d3.scaleLinear()
            .domain([5, 25])
            .range([height, 0]);
        
        // area for deficit
        const areaDeficit = d3.area()
            .defined(d => d.ma !== null)
            .x(d => x(d.year))
            .y0(y(16.5))
            .y1(d => d.ma < 16.5 ? y(d.ma) : y(16.5));
        
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickFormat(d3.format("d")));
        svg.append("g")
            .call(d3.axisLeft(y));
        
        // axis labels
        svg.append("text")
            .attr("x", width / 2 + 15)
            .attr("y", height + 40)
            .style("text-anchor", "middle")
            .style("font-weight", "bold")
            .text("Year");
        
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left + 15)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#333")
            .style("font-weight", "bold")
            .text("Natural Flow (Million Acre-Feet)");

        
        // dashed red line for allocation
        svg.append("line")
            .attr("x1", 0)
            .attr("y1", y(16.5))
            .attr("x2", width)
            .attr("y2", y(16.5))
            .attr("stroke", "red")
            .attr("stroke-dasharray", "4")
            .attr("stroke-width", 2);
        
        
        svg.append("path")
            .datum(data)
            .attr("fill", "rgba(255, 0, 0, 0.2)")
            .attr("d", areaDeficit);
        
        const line = d3.line()
        .defined(d => d.ma !== null)
        .x(d => x(d.year))
        .y(d => y(d.ma))
        .curve(d3.curveMonotoneX);

    // Add path
    const path = svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "#005a8d")
        .attr("stroke-width", 3)
        .attr("d", line);

    // Animate path
    const totalLength = path.node().getTotalLength();
    path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(2500)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);

    // tooltip
    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

        svg.append("text")
            .attr("x", width / 2 - 100)
            .attr("y", y(16.5) - 10)
            .attr("fill", "red")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text("Total Allocation (~16.5 MAF)");

    // Add invisible dots for hovering over the line
    svg.selectAll(".dot")
        .data(data.filter(d => d.ma !== null))
        .enter().append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.ma))
        .attr("r", 6)
        .attr("fill", "transparent")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("fill", "#005a8d");
            tooltip.transition().duration(200).style("opacity", .9);
            tooltip.html(`<strong>${d.year}</strong><br/>10-Yr Avg: ${d.ma.toFixed(2)} MAF`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(d) {
            d3.select(this).attr("fill", "transparent");
            tooltip.transition().duration(500).style("opacity", 0);
        });
}