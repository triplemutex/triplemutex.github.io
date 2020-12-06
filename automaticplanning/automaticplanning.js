/*
Description:

    This program is an educational project demonstrating the use of basic machine learning 
    algorithms for the purpose of logistic resource management and route planning

Implementation:

    * Include this source file via a script tag in an html page
    * Instantiate the class in a script tag
    * The constructor argument must be a DOM node corresponding to an existing HTML element in the page 
    * the class constructor will attach a canvas and the necessary buttons and inputs    

Usage:
   
    * add 'trajectories' by clicking twice on the canvas, the first click will add rhe origin the second the destination
    * optionally set a higher number of clusters
    * click route to cluster the trajectories into trips and route those trips 


GPLv3 license notification:

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

Copyright: triplemutex@gmail.com

*/

class AutomaticPlanning
{
	// constructor takes the canvas as argument
	constructor(applicationelement)
	{
		// create a div for the buttons
		this.buttonsdiv = document.createElement("DIV");
		this.buttonsdiv.setAttribute("ID","ap_buttonsdiv");
		applicationelement.appendChild(this.buttonsdiv);

		// create the canvas
		this.canvas = document.createElement("CANVAS");
		this.canvas.setAttribute("ID", "ap_canvas");
		this.canvas.setAttribute("height", "800");
		this.canvas.setAttribute("width", "800");
		this.canvas.setAttribute("style", "border:1px solid #000000;");
		applicationelement.appendChild(this.canvas);

		// create the route button
		this.routebutton = document.createElement("INPUT");
		this.routebutton.setAttribute("type", "button");
		this.routebutton.setAttribute("value", "Cluster and Route");
		this.routebutton.setAttribute("id", "routebutton");
		this.buttonsdiv.appendChild(this.routebutton);

		// label for the numerberofclusters input
		var labelsortbutton = document.createElement("LABEL");
		labelsortbutton.setAttribute("for", "numclustersinput");
		labelsortbutton.innerHTML = "Number of Clusters: ";
		this.buttonsdiv.appendChild(labelsortbutton);

		// create the numerberofclusters input
		this.numclustersinput = document.createElement("INPUT");
		this.numclustersinput.setAttribute("type", "number");
		this.numclustersinput.setAttribute("id", "numclustersinput");
		this.numclustersinput.setAttribute("name", "numclustersinput");
		this.numclustersinput.setAttribute("min", 0);
		this.numclustersinput.value = 1;
		this.buttonsdiv.appendChild(this.numclustersinput);

		// create the position input
		this.positioninput = document.createElement("INPUT");
		this.positioninput.setAttribute("id", "positioninput");
		this.positioninput.setAttribute("readonly", "true");
		this.buttonsdiv.appendChild(this.positioninput);

		// create a context on the convas
		this.ctx = this.canvas.getContext("2d");

		// all points used		
		this.points = {};

		// all trajectories
		this.trajectories = {};

		// the length of all trajectoties
		this.distances = [];		

		// the average length of all trajectories
		this.trajectoriesaveragelength = 0;

		// a variable to hold a created but not completed trajectory
		this.currentrajectory = false;

		// clicking on canvas event 
		this.canvas.addEventListener(
                	'click',
			//this.addpoint.bind(this)
			this.addtrajectory.bind(this)
        	);

		// mousemove event show cursor position
		this.canvas.addEventListener(
                	'mousemove',
                	function(event)
                	{
				this.positioninput.value = event.offsetX +' , '+ event.offsetY ;
                	}.bind(this)
        	);

		// route button click event 
		this.routebutton.addEventListener(
                	'click',
			this.routingwrapper.bind(this)
        	);

		
		// the clusters for kmeans grouping
		this.clusters = [];


	}

	
	// a wrapper function for what to route if the routing button is clicked
	routingwrapper()
	{
		// reset the cluster
		this.clusters = [];

		// sort the trajectories into clusters
		this.sortrajectoriesintoclusters();

		// clear canvas
		this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);

		// a variable to hold the route(s)
		var route;
		
		// loop through the clusters
		for(var n in this.clusters)
		{
			// if there is no members in the clusters
			if(Object.keys(this.clusters[n].members).length == 0)
				// skip it
				continue;
			
			// compute the route
			route =this.routetrajectorylist(this.clusters[n].members);

			// draw the trajectories in light grey
			this.drawtrajectorylist(this.clusters[n].members, 'grey');

			// draw thge route
			this.drawroute(route, this.clusters[n].color);
		}	


	}



	// a function to save points trajectories to local storage
	savepointsandtrajectories()
	{
		localStorage.trajectories = JSON.stringify(this.trajectories);
                localStorage.points = JSON.stringify(this.points);
	}

	// a function to load trajectories from localstorage
	loadpointsandtrajectories()
	{
		this.trajectories = JSON.parse(localStorage.trajectories);
                this.points = JSON.parse(localStorage.points);
		this.distances = [];

                if(this.trajectories)
                {
			
			for(var index in this.trajectories)
			{
                        	// store the distance
                        	this.distances.push(this.trajectories[index].distance);
			}

                        // calculate the trajectoriesaveragelength
                        this.trajectoriesaveragelength = this.distances.reduce((a,c) => a + c)/this.distances.length;

                	// clear canvas
                        this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);

                        // draw trajectories
                        this.drawtrajectorylist(this.trajectories);
                }
	}



	// a function to add a point
        addpoint(event)
        {
		// add the point to the points object
                var newpoint = this.points[event.offsetX +'|'+ event.offsetY] = { x: event.offsetX , y: event.offsetY};

		// draw the point
                this.drawpoint(newpoint);

        }

	// a function to add (and complete) a trajectory and draw it
	addtrajectory(event)
	{
                // always store the point itself
		var newpoint = this.points[event.offsetX +'|'+ event.offsetY] = { x: event.offsetX , y: event.offsetY};

                // there is current no trajectory
                if(!this.currenttrajectory)
                {
                        // store the clicked point
                        this.currenttrajectory = {
                                'origin': newpoint
                        };

                        // draw it in black
                        this.drawpoint(newpoint);
                }
                else
                {
                        // store the clicked point
                        this.currenttrajectory.destination = { x: event.offsetX, y: event.offsetY};

                        // calculate the trajectories angle
                        //this.currenttrajectory.angle = Math.atan2((this.currenttrajectory.destination.x - this.currenttrajectory.origin.x), (this.currenttrajectory.destination.y - this.currenttrajectory.origin.y) *-1);

                        // calcultate the trajectories centroid
                        this.currenttrajectory.centroid = this.calculateeuclidiancentroid([this.currenttrajectory.origin, this.currenttrajectory.destination]);

                        // calculate the trajectories angle
                        this.currenttrajectory.centroid.angle = Math.atan2((this.currenttrajectory.destination.x - this.currenttrajectory.origin.x), (this.currenttrajectory.destination.y - this.currenttrajectory.origin.y) *-1);

                        // calculte the trajectories distance
                        this.currenttrajectory.distance = this.calculateeuclidiandistancepoints(this.currenttrajectory.origin, this.currenttrajectory.destination);

                        // draw the trajectory
                        this.drawtrajectory(this.currenttrajectory);

                        // store the trajectory
                        this.trajectories[this.currenttrajectory.centroid.x+'|'+this.currenttrajectory.centroid.y+'|'+this.currenttrajectory.centroid.angle] = this.currenttrajectory;

                        // store the distance
                        this.distances.push(this.currenttrajectory.distance);

                        // calculate the trajectoriesaveragelength
                        this.trajectoriesaveragelength = this.distances.reduce((a,c) => a + c)/this.distances.length;

                        // rest trajectory
                        this.currenttrajectory = false;

                }

	}



        // a function to draw a point
        drawpoint(point,color = 'black')
        {
                // set the stoke color to color
                this.ctx.strokeStyle = color;

                // set fill color to color
                this.ctx.fillStyle = color;

                // open the path
                this.ctx.beginPath();

                // draw the circle
                this.ctx.arc(point.x, point.y,3,0,2 * Math.PI)
                
                this.ctx.stroke();
                this.ctx.fill();
        }
	
	// a function to draw a trajectory (triangle pointing at the end point
	drawtrajectory(trajectory , color = 'black')
        {
                // save state
                this.ctx.save();             

                // set the stoke color to color
                this.ctx.strokeStyle = color;

                // set fill color to color
                this.ctx.fillStyle = color;

                // draw the starting point
                this.drawpoint(trajectory.origin,color);

                // draw a line between the points
                this.drawlinebetweenpoints([trajectory.origin, trajectory.destination], color);

                // draw the end triangle                        
                this.drawtriangle(trajectory.destination,trajectory.centroid.angle, color);

                // restore state
                this.ctx.restore();

        }

	// draw a triangle pointing a certain wat
	drawtriangle(point,rotation,color = 'black')
        {
                // save state
                this.ctx.save();             

                // set the stoke color to color
                this.ctx.strokeStyle = color;

                // set fill color to color
                this.ctx.fillStyle = color;

                // translate
                this.ctx.translate(point.x,point.y);

                // rotate
                this.ctx.rotate(rotation);

                // open the path
                this.ctx.beginPath();

                // draw line to bottomleft
                this.ctx.lineTo(- 6, 0);

                // up to the point
                this.ctx.lineTo(0,-12);

                // down to bottom right
                this.ctx.lineTo(6,0);

                // back to the start
                this.ctx.lineTo(0, 0);

                // fill
                this.ctx.fill();

                // restore state
                this.ctx.restore();
                
        }

	// draw a line between two point
	drawlinebetweenpoints(points, color ='black', linewidth = 1)
        {
                // save state
                this.ctx.save();             

                // set the stoke color to color
                this.ctx.strokeStyle = color;

		// set the line width
		this.ctx.lineWidth = linewidth;

                // set fill color to color
                this.ctx.fillStyle = color;
        
                // start new path       
                this.ctx.beginPath();

                // move to the origin
                this.ctx.moveTo(points[0].x,points[0].y);

                // draw line to destination point
                this.ctx.lineTo(points[1].x,points[1].y);

                // draw
                this.ctx.stroke();

                // restore state
                this.ctx.restore();
                
        }


	// calculate the euclidian centroid of a points aary
        calculateeuclidiancentroid(points_array)
        {
                // local variables for the centroid coordinates
                var centroid = { x: 0, y:0};

                // loop through the array
                for(var index in points_array)
                {
                        centroid.x += points_array[index].x;
                        centroid.y += points_array[index].y;
                }

                // averages
                centroid.x /= Object.keys(points_array).length;
                centroid.y /= Object.keys(points_array).length;

                // return as array
                return centroid;

        }

	// a function to calculate the euclidian distance between to points
	calculateeuclidiandistancepoints(org, dest)
        {
                // x side length
                var xsidelength = dest.x - org.x;

                // y side length
                var ysidelength = dest.y - org.y;

                // the distance between the two points
                var distance = Math.sqrt((xsidelength * xsidelength) + (ysidelength * ysidelength));

                // return it
                return distance;
                

        }

	// a function to sort trajectories into clusters
	sortrajectoriesintoclusters()
	{
		// get the number of clusters
		var numberofclusters = this.numclustersinput.value;

		// initialize the clusters
		for(var n = 0; n < numberofclusters; n++)
		{
			this.clusters[n] = {
				centroid: 
				{
                        		x: n,
                        		y: n,
                        		angle: Math.PI *2 *n / numberofclusters
                		},
				color: this.getrandomRgb(),
                		members: {}
			};
		}

		// for comparisons in convergence, a JSON string of the clusters
		var clustersJson = JSON.stringify(this.clusters);
		var clustersJsonNew;

		// a counter to limt the total number of iterances in case we cannot reach convergence
		var numberofkmeansiterances = 0;

		// while there is no convergance and we have not reached max interances
		while(numberofkmeansiterances < 100 && clustersJson != clustersJsonNew)
		{
			// set clustersJson to last rounds value
			clustersJson = clustersJsonNew;

			// run kmeanssort
			this.kmeanssort();

			// stringify the clusters
			clustersJsonNew = JSON.stringify(this.clusters);

			// increment iterator
			numberofkmeansiterances++;
		}

		// draw
		// clear canvas
		this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);


		// loop through numberofcluster
		for(var k = 0; k < numberofclusters; k++)
			// draw clusters in their colors
			this.drawtrajectorylist(this.clusters[k].members, this.clusters[k].color);
	


	}



	// a function to test the kmeanssorting algorithm
	kmeanssort()
	{
		// reset the members clusters
		for(var n in this.clusters)
			this.clusters[n].members = {};

		var smallest_distance_index;

		// loop through the trajectories
		for(var index in this.trajectories)
		{
			// get the smallest distace
			smallest_distance_index = this.smallestdistanceindex(this.trajectories[index],this.clusters);

			// add the point to the cluster 
			this.clusters[smallest_distance_index].members[index]= this.trajectories[index];


		}

		// loop through clusters
		for(var m in this.clusters)
			// calculate the centroid for this cluster
			this.clusters[m].centroid = this.calculatecentroid(this.clusters[m].members);			


	}

	// a function to find the cluster index with the smallest distance
	smallestdistanceindex(trajectory, clusters)
	{
		// a variable for distance to be used in this function
		var distance;

		// the smallest distance yet
		var smallest = false;

		// the value we will return
		var returnindex;	

		// loop through the centroid and clusters (they share the same index)
		for(var cindex in clusters)
		{
			// is the cluster full
			if(Object.keys(clusters[cindex].members).length >= Object.keys(this.trajectories).length/clusters.length)
				// skip
				continue;


			// distance to the centroid with this index
			distance = this.calculatedistancecentroids(clusters[cindex].centroid, trajectory.centroid, this.trajectoriesaveragelength);


			// id no smallest is set yet orif the distance is smaller than smallest
			if(!smallest || distance < smallest)
			{
				// this is the smallest then
				smallest =  distance;

				// set the return index
				returnindex = cindex;
				
			}

		}

		// return the index found
		return returnindex;
	}

	// a function to calculate the distance (including on direction level) between 2 centroids (trajectory or cluster centroids)
	calculatedistancecentroids(org, dest, trajectoriesaveragelength = 1)
	{
		// first the euclidian distance between the centoid points
		var euclidiandistance = this.calculateeuclidiandistancepoints(org, dest);

		// ther diffrence between their directions multiplied divided by PI to put it between 0 and 1 multuplied with thewith the trajectoriesaveragelength
		var directiondiffrence = (Math.abs((Math.abs(org.angle - dest.angle) + Math.PI) % (2*Math.PI) - Math.PI))/Math.PI * trajectoriesaveragelength; 
		

		// calculate 3rd dimansioin distance and return
		return Math.sqrt((euclidiandistance * euclidiandistance) + (directiondiffrence * directiondiffrence));
	}

	

	// a function to calculate a centroid for a set of trajectories
	calculatecentroid(trajectories)
	{
		// local variables for the centroid coordinates
		var centroid = { x:0, y:0, angle:0};
		var sumsin = 0;
		var sumcos = 0;

		// loop through the array
		for( var index in trajectories)
		{
			// add up the x and y coords
			centroid.x += trajectories[index].centroid.x;
			centroid.y += trajectories[index].centroid.y;

			// add up sin and cos foir the angle
			sumsin += Math.sin(trajectories[index].centroid.angle);
			sumcos += Math.cos(trajectories[index].centroid.angle);

		}

		// averages for euclidian 
		centroid.x /= Object.keys(trajectories).length;
		centroid.y /= Object.keys(trajectories).length;

		// atan2 'average' for angles		
		centroid.angle = Math.atan2(sumsin,sumcos);

		// return the centroid
		return centroid;

	}


        drawtrajectorylist(trajectorylist, color)
        {
                // loop through the thrajectorylist
                for( var index in trajectorylist)
                        // draw the trajectory
                        this.drawtrajectory(trajectorylist[index] , color);

        }

	// create a rgb string for css
	getrandomRgb()
	{
		// create an rbg string useable in css and return it
		return 'rgb('+this.getRandomInt(255)+','+this.getRandomInt(255)+','+this.getRandomInt(255)+')';
	}

	// a (pseudo) random integer creator with a max
	getRandomInt(max) 
	{	
		// create and rertun reandom int
  		return Math.floor(Math.random() * Math.floor(max));
	}

	// calculate a route for a trajectory list
	routetrajectorylist(trajectorylist, centroid = false)
	{
		// distance matrix for all points relevant to the trajectorylist we are routing
		var distances = {};

		// points that are the origing in a trajectoty
		var points = {};

		// extract all the points
		// loop through the trajectories
		for(var index in trajectorylist)
		{
			// write the origin
			points[trajectorylist[index].origin.x + '|' + trajectorylist[index].origin.y] = {
				destinationindex: trajectorylist[index].destination.x +'|'+ trajectorylist[index].destination.y,
				x: trajectorylist[index].origin.x,
				y: trajectorylist[index].origin.y,
				tentativedistance: Infinity
			};

			// write the destination
			points[trajectorylist[index].destination.x + '|' + trajectorylist[index].destination.y] = {
				originindex: trajectorylist[index].origin.x +'|'+ trajectorylist[index].origin.y,
				x: trajectorylist[index].destination.x,
				y: trajectorylist[index].destination.y,
				tentativedistance: Infinity
			};

		}

		// if no centroid is provided
		if(!centroid)
			// get the cetriod of the trajectory
			centroid = this.calculateeuclidiancentroid(points);

		// write it to the points array
		points.centroid = centroid;


		// write a distance matrix for all the points in the trajectories inclusing the centroid
		// loop through the points
		for(var n in points)
		{
			distances[n] = {};			

			// loop through the pints
			for(var m in points)
				// calculate distance
				distances[n][m] = this.calculateeuclidiandistancepoints(points[n], points[m]);
		}

		// the index of the startin point is the origin point farthest from the center of the cluster 
		var startingpointindex = this.getIndexFarthestOriginFromCentroid(points, distances);

		// set starting point to 0
		points[startingpointindex].tentativedistance = 0;

		// the route array of indices we want to return		
		var route = []

		// remove the centroid
		delete points.centroid;

		// do until filled
		this.routingiterator(points, startingpointindex,route,distances);

		// return the route
		return route;

	}


	// recursive function returning a route as an array of point indices
	routingiterator(pointslist, startingpointindex,route = [] ,distancematrix)
	{
		// a variable for the smallest tentative distance
		var mintentativedistance = Infinity;

		// the index of the next startingpoint
		var nextstartingpointindex;

		// loop through the pointslist
		for(var index in pointslist)
		{
			// if this is the startingpoint or the centroid
			if(index == startingpointindex)
				// skip it
				continue;

			// set the tentative distance for the point
			pointslist[index].tentativedistance = distancematrix[startingpointindex][index];

			// if the point is a destination and its origin is still in the points list
			if(pointslist[index].originindex && pointslist[index].originindex != startingpointindex && pointslist[pointslist[index].originindex])
			{
				console.log('skipping ' + index);
	
				// we will skip it
				continue;
			}

			// if this is now thew point wqiuth the lowest tentative distance
			if(pointslist[index].tentativedistance < mintentativedistance)
			{
				// set the smallest tentative distamce
				mintentativedistance = pointslist[index].tentativedistance;

				// set this point to be the next startingpoint
				nextstartingpointindex = index;	
			}
		}


		// add the current starting point to the route
		route.push(startingpointindex);

		//  remove the current starting point from the points list
		delete pointslist[startingpointindex];

		// if there is points left in the pointslist
		if(Object.keys(pointslist).length > 0)
			// call this funcion recursively
			this.routingiterator(pointslist, nextstartingpointindex,route,distancematrix);

		// return the populated route array
		return route;		


	}


	// a function to find the point with the biggest distance to a centroid from a subset (the pointslist)
	getIndexFarthestOriginFromCentroid(pointslist, distancematrix)
	{
		// the max counter
		var max  = 0;	

		// the return value
		var maxindex;

		// loop through the centroids distances list
		for(var pointindex in pointslist)
		{
			// if the point is a destination
			if(pointslist[pointindex].originindex)
				// skip it;
				continue;

			// if the distance to the point is greater than max
			if(distancematrix.centroid[pointindex] > max)
			{
				// it becomes the max
				max = distancematrix.centroid[pointindex]; 

				// set maxindex to the points index
				maxindex = pointindex
			}
			
		}

		// return the max's point index
		return maxindex;
	}

	// draw the route on canvas
        drawroute(route, color = 'red')
        {
                // loop through the route
                for(var n=0 ; n<route.length-1 ; n++)
                {
			// draw the line between the points
                        this.drawlinebetweenpoints([this.points[route[n]], this.points[route[n+1]]], color, 5);

			// draw the triagles at the end of the segment
			this.drawtriangle(this.points[route[n+1]],Math.atan2((this.points[route[n+1]].x - this.points[route[n]].x), (this.points[route[n+1]].y - this.points[route[n]].y) *-1), color);

                }
        }





}
