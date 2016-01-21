/************
TODO :

A DISCUTER
- quoi afficher dans détails
- comment faire figurer montant connus / inconnus (ma suggestion: pas dans sunburst)

HIGH
√ - calculer pourcentages dans données (0.5h : 16:00)
- multilingue : à discuter -> fichier lang.fr.js importé dans .html et qui crée une variable globale ? 
Probablement le plus simple...

CONVENU CAFE DE GRANCY
√ - fixed-tooltip à cacher sur mobile 
√ - tooltip: afficher aussi on mouse-over du breadcrumb (1h - 15:30)
~ - catégories : sparkline similaire NY times pour vue détaillée, fonction qui le fait (+ icônes?) -> refactor disposition
~ - détails, comme dans carnet
- résumé dans structures bootstrap plutôt que table
- tooltip sur entreprise: table avec catégories de dépenses (reprendre icônes ?)
- switch années au-dessous sunburst "Année: 2011 2012 2013 etc."
√ - intégrer données Alex
√ - refactor données pour calculer la valeur des 'Unknown'
- basic tracking analytics
X - label sunburst : mettre % en + sur les plus gros (si place)
- dernier niveau (seulement) -> ajouter le type de prestation, par ex. avec icône ? 


MIDDLE
- "polissage" par Inventaire ?
- garder "état de la visualisation" quand on change d'année ? (= actuel filter, je pense, garder le datum actuel...)
- pym.js


LOW
X - Breadcrumb sur mobile (pas d'overlap)
- transition pour bar chart
- vraies données
- use breadcrumb from bootstrap
- interaction continue sur mobile pour sunburst (y.c. fixed tooltip -> différencier avec media queries ?)
  => voir aussi http://bl.ocks.org/mbostock/770ae19ca830a4ce87f5 -> listener ailleurs ? laisser tomber ?


√ - générer un breadcrumb plus évolué ? cf. http://bl.ocks.org/kerryrodden/7090426
√ - refactoring : modules ! -> sortir le traitement des data et préparation pour les deux viz
√ - tooltip: dans sunburst une zone fixe plutôt ?? Sous le breadcrumb par ex. ?
√ - highlight sunburst en masquant les autres (baisser opacité)
√ - rendre interaction indépendante du clic -> avoir une fonction "showDetail(dept)"
√ - update showDetail to provide data in argument, not dept name


*******************/

var globals = require('./globals.js');
var load = require('./load.js');
var spark = require('./sparkline.js');

/**************** data loading & initialization ******************/

var fullData; // full data 
//d3.dsv(";")("import/fake2.csv", function(error, data) {
d3.dsv(",")("import/EDA-UVEK-merge.csv", function(error, data) {
  globals.currentYear = 2014; 

	fullData = data;

  // set year
  d3.select("#year").text(globals.currentYear)

	// create sunburst
	var sbData = load.prepareDataSunburst(data,globals.currentYear);
	buildSunburst(sbData);

	//show the details pane for root node of sunburst
	showDetail(sbData);

	// init responsiveness of svgs
	ds.responsive(d3.select("#sunburst-container svg")).start();

});

/**************** sunburst building *****************/

var margin = {top: 30, right: 20, bottom: 20, left: 20},
    width = 550 - margin.left - margin.right,
    height = 550 - margin.top - margin.bottom;

var svg = d3.select("#sunburst-container").append("svg")
    .attr("width", width+margin.left+margin.right)
    .attr("height", height+margin.top+margin.bottom)
    .append("g")
      .attr("transform","translate("+margin.left+","+margin.top+")")
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")");

var radius = (Math.min(width, height) / 2) - 5;

var x = d3.scale.linear()
    .range([0, 2 * Math.PI]);

var y = 
	//d3.scale.sqrt() // original
	d3.scale.linear()
      .range([0, radius]);

var partition = d3.layout.partition()
    .value(function(d) { return d.chf; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, y(d.y)); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

/*
var color = d3.scale.linear()
	//.range(["#bf482c", "#fff"])
	.range(["#888", "#eee"])
	.interpolate(d3.interpolateLab);
*/
// Brewer pastel2
var color = d3.scale.ordinal()
	.range(["#cbd5e8","#fdcdac","#b3e2cd","#f4cae4","#e6f5c9","#fff2ae","#f1e2cc","#cccccc"]);
/*
var color = d3.scale.ordinal()
	.range(["#444", "#555", "#666", "#777", "#888", "#999", "#aaa", "#bbb", "#ccc", "#ddd", "#eee"]);
*/
function setColors(node,idx) {
  if(typeof node.parent === 'undefined') {
    // Root node color
    node.color = "#ffffff"; 
  } else if(typeof node.parent.parent === 'undefined') { 
    // First level after root -> fixed color
    node.color = color(node.name);
  } else {
    // Children nodes
    var pc = node.parent.color;
    // slightly brighter than parent
    var c = d3.lab(pc);
    node.color = c.brighter(0.7).toString();
    if(node.children != null) {
      node.children.forEach(function(n,i){setColors(n,idx)});
    }
  }
  node.hcolor = d3.lab(node.color).brighter().toString();
  return node;
}

// return true if in subtree self or parent (n = current node, p = parent to test)
function inSubTree(n,p) {
  if(n == p) {
    return true
  } else if(typeof n.parent === 'undefined') {
    return false;
  } else if(n.parent == p) {
    return true
  } else {
    return inSubTree(n.parent, p);
  }
}

//g's with data associated in sunburst
var sunburstG; 

function buildSunburst(data) {
  // Partition & Build viz
  var nodes = partition.nodes(data);

  // colorize
  color.domain(data.children.map(function(d) {return d.name} ));
  nodes.forEach(function(n,i){ setColors(n,i) });
  //color.domain([0,2]);

  sunburstG = svg.selectAll("path")
      .data(nodes)
    .enter().append("g");

  var paths = sunburstG.append("path")
      .attr("d", arc)
      .style("fill", function(d) { return d.color; })
	  .on("click touchend", function(d) { return showDetail(d); })
	  .on("mouseover", mouseOver)
	  .on("mouseout", mouseOut)
	  //.on("touchstart", function(d) { console.log("touchstart"); console.log(d); mouseOver(d); })
	  //.on("touchmove", function(d) { console.log("touchmove"); console.log(d); mouseOver(d); })
	  //.on("mouseout", mouseOut)
      //.style("fill", "#ccc")//function(d) { return color((d.children ? d : d.parent).name); })
	  //.style("fill", function(d) { return color(d.depth) });
      
  var text = sunburstG.append("text")
  	.text(function(d) { return d.name; })
    .attr("text-anchor", textAnchor)
    .attr("transform", textTransform)
    .style("opacity", textOpacity)
    .attr("dy", ".35em"); // vertical-align
    
  // moving tooltip with chf / value
  /*
  sunburstG.append("title")
        .text(function(d) { return d.name + "\n" + "CHF " + ds.formatNumber(d.value); });
  */
/*
  var tt = ds.ttip(sunburstG);
  tt.html(function(d) { 
  		return "<h4>"+d.name+"</h4>"+
  			"<p>CHF  "+ds.formatNumber(d.value)+"</p>"
  	}
  );
*/
}

/**************** interaction *****************/

function mouseOver(d) {
	sunburstG
      	.style("opacity", ".33")
        .filter(function(dd) { return inSubTree(dd,d); })
        .style("opacity", "1");
  	// Fixed tooltip on sunburst
  	d3.select("#fixed-tooltip-dept").text(d.nameFull);
  	d3.select("#fixed-tooltip-chf").text("CHF " + ds.formatNumber(d.value));
  	d3.select("#fixed-tooltip-percent").text( 
      (typeof d.parent !== 'undefined' ?  //root node -> no text
        (d.percent < 1 ? "< 1" : d.percent)  + " % " + globals.lang.of + " " + d.parent.name 
        : "")); 
}

function mouseOut(d) {
	sunburstG
	    .style("opacity", "1");
	d3.selectAll("#fixed-tooltip *").text(null);
}

// Returns amount of known suppliers in d and children
function getChildrenAmountKnown(d) {
  var f;
  if(d.depth == 0) {
    f = function(dd) { return dd.supplier !== globals.UNKNOWN; }
  } else if(d.depth == 1) {
    f = function(dd) { return (dd.supplier !== globals.UNKNOWN) && (dd.dept === d.name); }
  } else if(d.depth == 2) {
    f = function(dd) { return (dd.supplier !== globals.UNKNOWN) && (dd.office === d.name); }
  }
  return d3.sum(fullData.filter(f), function(dd) {return +dd.amount})
}

// show extended details pane for a selected / clicked element (given data)
function showDetail(d) {
	
   // global color to be this color
  globals.currentColor = d.color;

	// update sunburst
	var trans = sunburstG.transition()
      .duration(750)
      .tween("scale", function() {
        var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
            yd = d3.interpolate(y.domain(), [d.y, 1]),
            yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
        return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
      });
	trans.selectAll("path")
	      .attrTween("d", function(d) { return function() { return arc(d); }; });
	trans.selectAll("text")
	  	  .attrTween("transform", function(d) { return function() { return textTransform(d); } })
	  	  .attrTween("text-anchor", function(d) { return function() { return textAnchor(d); } })
	  	  .styleTween("opacity", function(d) { return function() { return textOpacity(d); }; });

  // update detail summary text
  updateSummary(d);
	
  // update bar chart
	var fdata;
	if(d.depth == 0) {
		fdata = fullData;
	} else if (d.depth == 1) {
		fdata = fullData.filter(function(dd){return dd.dept === d.name});
	} else if (d.depth == 2) {
		fdata = fullData.filter(function(dd){return dd.office === d.name});
	}
	updateBar(fdata);

	// update bar chart title
	d3.select("#officename").text(d.nameFull);

	// update breadcrumb trail
	breadCrumb(d);

  // update sparklines
  updateSparklines(fdata);
}

// Given data d, build breadcrumb iteratively
function breadCrumb(d) {
	var p = d, bc = d3.select("#breadcrumb");
	bc.selectAll("*").remove();
	while ( typeof p !== 'undefined' ) {
		// separator >
		bc.insert("span", ":first-child")
			.attr("class","separator")
			.text(">");
		var n = bc.insert("span", ":first-child")
      .datum(p) // attach current data to breadcrumb button
			.attr("class","btn btn-default")
      .style("background-color", p.color)
			.on("click", function(dd) { showDetail(dd) })
      .on("mouseover", mouseOver) // show tooltip on hover of breadcrumb
      .on("mouseout", mouseOut);   // hide tooltip on hover of breadcrumb
		// home icon for root
		if(p.name == globals.lang.root) {
			n.append("i").attr("class", "fa fa-home");
		}
		// text of breadcrumb trail
		n.append("span").text(p.name);
		// iteratively get up in hierarchy
		p = p.parent;
	}
	bc.select("span.separator:last-child").remove(); // remove last ' > ';
}


/******************************************
 HELPER functions for sunburst labels placement
*******************************************/

// text should be visible only if |startAngle - endAngle| > MINANGLE degrees, and not in center
function textOpacity(d) {
  	var diff = arc.startAngle()(d) - arc.endAngle()(d);
  	var mina = Math.PI * globals.MINANGLE / 180; 
  	var show = Math.abs(diff) > mina && arc.innerRadius()(d) != 0; // inner radius == 0 iff center
  	return show ? 1 : 0;
}

// returns angle of a given data label in sunburst (normalized between 0 and 360) (i.e. middle of arc)
function getAngle(d) {
	var angle = ( (arc.startAngle()(d) + arc.endAngle()(d)) / 2 ) - Math.PI / 2;
	angle = angle / Math.PI * 180; // to degrees 
	var newAngle = angle;
  while (newAngle <= 0) newAngle += 360;
  while (newAngle > 360) newAngle -= 360;
  return newAngle;
}

// text should be flipped if between 90 and 270
function shouldFlipText(angle) {
	return ((angle > 90) && (angle < 270));
}

// returns text transform for labels in sunburst
function textTransform(d) {
	var margin = 6;
	var angle = getAngle(d);
	var flip = shouldFlipText(angle);
	nAngle = flip ? angle - 180 : angle;  // if flip -> - 180 degrees
	var transY = flip ? -margin - y(d.y) : margin + y(d.y); // fix position if flipped
    return "rotate(" + nAngle + ")translate(" + transY + ",0)";
}

function textAnchor(d) {
	return shouldFlipText(getAngle(d)) ? "end" : "start";
}



/***************** bar chart -> to export elsewhere ? **************************/


/**************** update bar ******************/

function updateBar(data) {
	var d = load.prepareDataBar(data);
	buildBar(d.slice(0, globals.SUPPLIER_AMOUNT)); //take only SUPPLIER_AMOUNT first suppliers, FIXME : put elsewhere ?
}

/**************** viz building bar ******************/

function buildBar(data) {
  
  var HEIGHT = 16; // height of bar

  var barmargin = {top: 20, right: 40, bottom: 20, left: 150},
  barwidth = 500 - barmargin.left - barmargin.right,
  barheight = Math.max(HEIGHT,                                       // FIXME : not sure...
                data.length * HEIGHT - barmargin.top - barmargin.bottom
            );

  var ybar = d3.scale.ordinal()
      .rangeRoundBands([0, barheight], .1);

  var xbar = d3.scale.linear()
      .range([0, barwidth]);

  var xAxis = d3.svg.axis()
      .scale(xbar)
      .orient("top")
      .ticks(4)
      .tickFormat(function(d) { return ds.formatNumber(d) });

  var yAxis = d3.svg.axis()
      .scale(ybar)
      .orient("left")
      .tickFormat(function(d) { return d.substring(0, globals.SUPPLIER_LABEL_MAX) 
            + (d.length > globals.SUPPLIER_LABEL_MAX ? "..." : ""); });

  //cleanup
  d3.select("#barchart-container svg").remove();
  
  var svgbar = d3.select("#barchart-container").append("svg")
      .attr("width", barwidth + barmargin.left + barmargin.right)
      .attr("height", barheight + barmargin.top + barmargin.bottom)
    .append("g")
      .attr("transform", "translate(" + barmargin.left + "," + barmargin.top + ")");

  //svgbar.selectAll("*").remove();

  xbar.domain([0, d3.max(data, function(d) { return d.amount; })]);
  ybar.domain(data.map(function(d) { return d.supplier; }));

  svgbar.append("g")
      .attr("class", "x axis")
      .call(xAxis)
      .append("text")
      	.attr("x", xbar.range()[1])
      	.attr("dy", "-.71em")
      	//.style("text-anchor", "end")
      	.text("CHF");

  svgbar.append("g")
      .attr("class", "y axis")
      .call(yAxis)

  var bars = svgbar.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("y", function(d) { return ybar(d.supplier); })
      .attr("height", ybar.rangeBand())
      .attr("x", function(d) { return xbar(0); })
      .attr("width", function(d) { return xbar(d.amount); })
      .style("fill", globals.currentColor);

  // tooltip
  var tt = ds.ttip(bars);
  tt.html(function(d) { 
  		return "<h4>"+d.supplier+"</h4>"+
  			"<p>CHF  "+ds.formatNumber(d.amount)+"</p>"
  	}
  );

  // responsiveness
  ds.responsive(d3.select("#barchart-container svg")).start();
}


/**************** details: 'summary' ******************/

function updateSummary(d) {
  var known = getChildrenAmountKnown(d), unknown = d.chf - known;
  d3.select("#details-total").text(ds.formatNumber(d.chf));
  d3.select("#details-known").text(ds.formatNumber(known));
  d3.select("#details-unknown").text(ds.formatNumber(unknown));
  d3.select("#details-known-percent").text(Math.round(100*known/d.chf) + "%");
  d3.select("#details-unknown-percent").text(Math.round(100*unknown/d.chf) + "%");
  d3.select(".total").style("background-color", globals.currentColor);
}

/**************** details: sparklines ******************/

function updateSparklines(filtereddata) {
  // clean sparkline
  var div = d3.select("#sparkline-container");
  div.selectAll("*").remove();
  
  //with fake data
  /*
  for(var i=0; i<3; i++) {
    var sparkdata = fullData.filter(function(d) {return d.office === "BBL" && d.category === "Bureautique"});
    spark.Sparkline(div,sparkdata);
  }
  */
  ///*
  // with real data
  // group by category, compute total over category, and store in array
  var cats = d3.nest()
    .key(function(d) { return d.fullCategory; })
    .rollup(function(values) { return d3.sum(values, function(d) {return +d.amount; }) })
    .entries(filtereddata);
  // sort by descending total over category
  cats = cats.sort(function(a,b) {return d3.descending(a.values,b.values)});
  // create a sparkline for each category
  cats.forEach(function(c) {
    spark.Sparkline(div, filtereddata.filter(function(dd) { return dd.fullCategory === c.key; }));
  }); 
//*/
}
