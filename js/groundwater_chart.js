function drawGroundwaterChart() {
    const container = document.getElementById('groundwaterChart');
    if (!container) {
        console.error("Container #groundwaterChart not found!");
        return;
    }

    const rect = container.getBoundingClientRect();
    const margin = { top: 60, right: 30, bottom: 50, left: 180 };
    
    const width = (rect.width || 800) - margin.left - margin.right;
    const height = (rect.height || 500) - margin.top - margin.bottom;

    d3.text("data/groundwater.csv").then(rawText => {
        const rows = d3.csvParseRows(rawText);

        let data = rows.map(row => {
            if (row.length < 3) return null;
            let name = row[0];
            let value = row[2];
            if (!name) return null;
            if (typeof value === 'string') value = value.replace(/,/g, '');
            value = +value;

            return { name: name, value: value };
        });

        // Filter valid data
        data = data.filter(d => d && !isNaN(d.value) && d.value > 10);

        data.sort((a, b) => b.value - a.value);
        data = data.slice(0, 10);

        createGWChart(data, width, height, margin);

    }).catch(err => console.error("Error loading groundwater.csv:", err));
}

function createGWChart(data, width, height, margin) {
    d3.select("#groundwaterChart").selectAll("*").remove();
    d3.selectAll(".gw-tooltip").remove();

    const tooltip = d3.select("body").append("div")
        .attr("class", "gw-tooltip")
        .style("opacity", 0);

    const svg = d3.select("#groundwaterChart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)])
        .range([0, width]);
        
    const y = d3.scaleBand()
        .domain(data.map(d => d.name))
        .range([0, height])
        .padding(0.3);

    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.name))
        .attr("height", y.bandwidth())
        .attr("width", 0)
        .attr("fill", d => d.name.includes("Arizona") ? "#ea0c0cff" : "#3b82f6")
        .on("mouseover", function(event, d) {
            d3.select(this).attr("opacity", 0.7);
            
            const maf = (d.value * 0.8107).toFixed(1);
            
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${d.name}</strong><br/> Depletion: ${d.value} km³<br/> (~${maf} MAF)`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).attr("opacity", 1);
            tooltip.transition().duration(500).style("opacity", 0);
        })
        .transition()
        .duration(1500)
        .attr("width", d => x(d.value));

    // Axes
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain").remove();
        
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));

    // Labels
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -25)
        .style("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("fill", "#1e3a8a")
        .text("Largest Groundwater Depletions (1900-2000)");

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#666")
        .text("Total Volume Lost (Cubic Kilometers)");
}