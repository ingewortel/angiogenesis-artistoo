

function setSliders(){

	for( let i = 0; i < Object.keys( rangeMap ).length; i++ ){
		
		const sliderID = Object.keys( rangeMap )[i]
		const confID = rangeMap[sliderID]
		
		// shared model parameters: set directly from C.conf
		if( confID.model == "shared" ){
			let value
			let conf = sim.C.conf
			if( confID.constraint != undefined ){
				conf = sim.C.getConstraint( confID.constraint ).conf
			}
			if( confID.position.length == 0 ){
				value = confID.modelToRange( conf[confID.key] )
			
			} else if ( confID.position.length == 2 ){
				value = confID.modelToRange( conf[confID.key][confID.position[0] ][confID.position[1] ] )
				
			} else {
				value = confID.modelToRange( conf[confID.key][confID.position[0] ] )
			}
			document.getElementById( sliderID ).value = value
		}
		
	}
}

function sliderInput(){
	
	for( let i = 0; i < Object.keys( rangeMap ).length; i++ ){
		
		const sliderID = Object.keys( rangeMap )[i]
		const map = rangeMap[sliderID]
		
		const sliderValue = parseFloat( document.getElementById( sliderID ).value )
		const modelValue = map.rangeToModel( sliderValue )
		
		// update logger next to slider
		const bubble = document.getElementById( sliderID ).parentElement.querySelector('.bubble')
		let bubbleText = map.rangeToModel(parseFloat( document.getElementById( sliderID ).value ))
		if( map.hasOwnProperty("bubbleText")) bubbleText = map.bubbleText(parseFloat( document.getElementById( sliderID ).value ))
		bubble.innerHTML = bubbleText
		
		// update model parameters.
		let conf = sim.C.conf
		if( map.constraint != undefined ){
			conf = sim.C.getConstraint( map.constraint ).conf
		}
			
		if( map.position.length == 0 ){
			conf[map.key] = modelValue
		} else if ( map.position.length == 2 ){
			conf[map.key][map.position[0]][map.position[1]] = modelValue
			conf[map.key][map.position[1]][map.position[0]] = modelValue
		} else {
			conf[map.key][map.position] = modelValue
		}
				
	}
		
}

	function initCanvas(){

		const canvasID = "canvasModel"
		document.getElementById(canvasID).innerHTML = ""
		sim.helpClasses["canvas"] = true
		sim.Cim = new CPM.Canvas( sim.C, {zoom:config.simsettings.zoom, parentElement: document.getElementById(canvasID) } )	
		document.getElementById("time").innerHTML = 0
	}


function resetSim(){
	
	sim.running = false
	initialize()
	sliderInput()
	setPlayPause()
}


function setPlayPause(){
	if( sim.running ){
		$('#playIcon').removeClass('fa-play');$('#playIcon').addClass('fa-pause')
	} else {
		$('#playIcon').removeClass('fa-pause');$('#playIcon').addClass('fa-play')
	}	
}


