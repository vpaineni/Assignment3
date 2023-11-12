
function simulate(data,svg)
{

    var graph = {
        nodes: data.nodes,
        links: data.links
      };

    const width = parseInt(svg.attr("viewBox").split(' ')[2])
    const height = parseInt(svg.attr("viewBox").split(' ')[3])

    const main_group = svg.append("g")

   // calculate degree of the nodes:
    let node_degree={}; // initiate an object
    data.links.forEach((link) => {
        if(!node_degree[link.source]) {
            node_degree[link.source]=0;
        }
        if(!node_degree[link.target]) {
            node_degree[link.target]=0;
        }
        node_degree[link.source]++;
        node_degree[link.target]++;
    });

    // Scaling the number of publications
    const scale_radiusP = d3.scaleLinear()
        .domain(d3.extent(graph.nodes, d=> d.No_of_Publications))
       .range([8,20])

    // Scaling the node degrees
    const degree_min_max= d3.extent(Object.values(node_degree), d=> d);
    const scale_radiusD = d3.scaleLinear()
       .domain(degree_min_max)
        .range([10,35]);

    // Scaling the Colors for the nodes
    const uniqueCountries=Array.from(new Set(graph.nodes.map(d=> d.Country)));
    const colorScale = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, uniqueCountries.length))
                        .domain(uniqueCountries);

    // Function to class thenodes by countries
    const getClass=(Country)=>{
        let temp=Country.toString();
        return "gr_"+temp
    }

    // Adding links
    const link_elements = main_group.append("g")
        .attr('transform',`translate(${width/2},${height/2})`)
        .selectAll(".line")
        .data(graph.links)
        .enter()
        .append("line")
        .style("stroke-width", 2);

    // Adding nodes
    const node_elements = main_group.append("g")
        .attr('transform', `translate(${width / 2},${height / 2})`)
        .selectAll(".circle")
        .data(graph.nodes)
        .enter()
        .append('g')
        .attr("class",function (d){return getClass(d.Country)})
        .on("mouseenter", function (d,data){
            node_elements.classed("inactive", true)
            const selected_class=d3.select(this).attr("class").split(" ")[0];
            console.log("Node ID:", data.id);
            console.log(selected_class)
            d3.selectAll("."+selected_class)
                .classed("inactive", false)
        })
        .on("mouseleave", (d)=>{
            d3.selectAll(".inactive").classed("inactive",false)
        })
        .on("click", function(d,data) {
            d3.selectAll("#Author").text("Author Data")
            console.log("Node ID:", data.id)
            var authorData=d3.select(".authorDataContainer");
            authorData.select("#name").text("Name: " + data.Author);
            authorData.select("#ID").text("ID: " + data.id);
            authorData.select("#publications").text("Number of Publications: " + data.No_of_Publications);
            authorData.select("#country").text("Country: " + data.Country);
        })

    // Adding the circles to represent the nodes
    node_elements.append("circle")
        .attr("r", (d)=>{
            return scale_radiusP(d.No_of_Publications)
        })
        .attr("fill", function(d) {return colorScale(d.Country)})


    // Event listener for the node size
    d3.selectAll('input[name="radioGroup"]').on('change', updateNodeSize);

    function updateNodeSize() {
        var selectedOption = d3.select('input[name="radioGroup"]:checked').node().value;
        // Update the node size based on the selected option
        node_elements.selectAll("circle")
        .attr('r', function(d) {
            if (selectedOption === 'Publications') {
                return scale_radiusP(d.No_of_Publications); // Set publications as node size
            } else if (selectedOption === 'Degree') {
                return scale_radiusD(node_degree[d.id]); // Set degree as node size
            }
        })
        .attr("fill", function(d) {return colorScale(d.Country)});
    }

    // Create references to the input range elements
    let collideInput = document.getElementById("collide");
    let chargeInput = document.getElementById("charge");
    let linkStrengthInput = document.getElementById("linkStrength");
    let AlphaValue = document.getElementById("alpha")

    // Add event listeners to update the forces when the inputs change
    collideInput.addEventListener("input", updateCollideForce);
    chargeInput.addEventListener("input", updateChargeForce);
    linkStrengthInput.addEventListener("input", updateLinkStrength);

    // Initialize the forces with default values
    let collideForce = d3.forceCollide().radius((d)=>{return scale_radiusP(d.No_of_Publications)*4});
    let chargeForce = d3.forceManyBody();
    let linkForce = d3.forceLink(graph.links).id(d=>(d.id));

    // Create the force simulation
    let ForceSimulation = d3.forceSimulation(graph.nodes)
        .force("collide", collideForce)
        .force("x", d3.forceX())
        .force("y", d3.forceY())
        .force("charge", chargeForce)
        .force("link", linkForce)
        .on("tick", ticked);

    // Function to update collide force
    function updateCollideForce() {
        let radius = parseInt(collideInput.value);
        collideForce.radius(radius);
        ForceSimulation.alpha(.5).restart();
    }

    // Function to update the charge force
    function updateChargeForce() {
        let strength = parseInt(chargeInput.value);
        chargeForce.strength(strength);
        ForceSimulation.alpha(.5).restart();
    }

    // Function to update the link strength
    function updateLinkStrength() {
        let strength = parseFloat(linkStrengthInput.value);
        linkForce.strength(strength);
        ForceSimulation.alpha(.5).restart();
    }

    function ticked(){
        node_elements
            .attr('transform', (d)=>`translate(${d.x},${d.y})`)
        link_elements
            .attr("x1",d=>d.source.x)
            .attr("x2",d=>d.target.x)
            .attr("y1",d=>d.source.y)
            .attr("y2",d=>d.target.y)
        AlphaValue.innerText=ForceSimulation.alpha().toFixed(3)
    }

    svg.call(d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([1, 8])
    .on("zoom", zoomed));
    function zoomed({transform}) {
        main_group.attr("transform", transform);
    }

    // Add a drag behavior.
    node_elements.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
    
    invalidation.then(() => simulation.stop());
    
    return svg.node();
}
