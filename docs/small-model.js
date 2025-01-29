
let fs = [100,100] 	// 140,140
let Ncell = 100		// 200

let config = {

	field_size : fs,
	
	// CPM parameters and configuration
	conf : {
		torus : [true,true],						
		seed : 1,							
		T : 5,
		D : 1, // 0.75,	// diffusion coefficient in pix^2 / MCS
		Nd : 10, // execute diffusion in Nd steps/MCS
		alpha : 0.3, // 0.3, // secretion rate per MCS
		epsilon : 0.3, // 0.3, // decay rate per MCS
		J2: [[0,4], [4,1]],
		LAMBDA_V : [0,5],					
		V : [0,50],
		NbhOrder : { sampling: 1, adhesion: 4 }			
	},
	simsettings : {
	
		NRCELLS : [Ncell],		
		INNERFIELD : fs,			
		BURNIN : 1,
		CELLCOLOR : ["000000"],
		zoom : 3

	}
}

let chem_config = {
		LAMBDA_CH: [0,500],
		X : 0,
		s : 0.1,
		retract : true,
		CH_FIELD : {} // will be defined below
}

let sim, meter



// make contact-inhibited chemotaxis and add the saturation parameter
class ChemotaxisConstraintCI extends CPM.ChemotaxisConstraint {
	
	//concDiff( tp, ts ) {
	concDiff( targeti, sourcei ) {	
	
		let ct = this.field.pixti( targeti )
		let cs = this.field.pixti( sourcei ) 
		let saturation_coefficient = this.parameters["s"]
		
		//return 0
		
		let out = ( ( ct / (1.0+saturation_coefficient*ct )) - (cs / (1.0+saturation_coefficient*cs ) ) )
		return out
	}
	
	deltaH( sourcei, targeti, src_type, tgt_type ) {

		let lambdachem = this.cellParameter("LAMBDA_CH", src_type )
		let l1 = lambdachem
		if( this.parameters["retract"]){
			if( src_type == 0 ) lambdachem = this.cellParameter("LAMBDA_CH", tgt_type )
		}
		if( src_type != 0 & tgt_type != 0 ){
			lambdachem = lambdachem * this.parameters["X"]
		}
		
		if( lambdachem == 0 ) return 0 
		let delta = this.concDiff( targeti, sourcei )
		let out = -delta*lambdachem
		/*if( Math.random() < 0.0005 ){
			if( delta > 0 ) console.log( "dc = " + delta + "; lambda = " + l1 + "; dH = " + out)
		} */
		return -delta*lambdachem
	}
	
}

// more than standard neighborhood options
class CustomGrid extends CPM.Grid2D{
	constructor( extents, torus, defaultorder = 2 ){
		super( extents, torus )
		this.order = defaultorder
	}
	
	t(i){
		let t = i - 1 
		if( this.torus[1] && ( i % this.X_STEP === 0 ) ){
			t += this.extents[1]
		}
		return t
	}
	b(i){
		let b = i + 1
		if( this.torus[1] && ( (i+1-this.extents[1]) % this.X_STEP === 0 ) ){
			b -= this.extents[1]
		}
		return b
	}
	l(i){
		let l = i - this.X_STEP
		if( this.torus[0] && ( i < this.extents[1] ) ) {
			l += ( this.extents[0] * this.X_STEP )
		}
		return l
	}
	r(i){
		let r = i + this.X_STEP
		if( this.torus[0] && (  i >= this.X_STEP*( this.extents[0] - 1 ) ) ) {
			r -= ( this.extents[0] * this.X_STEP )
		}
		return r
	}
	neighi(i,order = this.order ){
		let t = this.t(i), b = this.b(i), r = this.r(i), l = this.l(i)
		if( order == 1 ){
			return[ l,r,t,b]
		}
		
		let tl = this.l(t), tr = this.r(t), bl = this.l(b), br = this.r(b)
		if( order == 2 ){
			return [tl,l,bl,t,b,tr,r,br]
		}
		
		let tt = this.t(t), ll = this.l(l), bb = this.b(b), rr = this.r(r)
		if( order == 3 ){
			return [tl,l,bl,t,b,tr,r,br,tt,ll,bb,rr]
		}
		
		let ttl = this.l(tt), ttr = this.r(tt), llt = this.t(ll), llb = this.b(ll),
			bbl = this.l(bb), bbr = this.r(bb), rrt = this.t(rr), rrb = this.b(rr)
		if( order == 4 ){
			return [tl,l,bl,t,b,tr,r,br,tt,ll,bb,rr, ttl, ttr, llt, llb, bbl, bbr, rrt, rrb ]
		}
		
		throw( "Orders >4 not implemented!" )
	}
}

// update to use variable order neighborhood
class Adhesion2 extends CPM.Adhesion {


	J( t1, t2 ) {
		return this.cellParameter("J2", t1)[this.C.cellKind(t2)]
	}
	neighi(i){
		return this.C.grid.neighi(i, this.conf.order)
	}
	confChecker(){
	
	}
	
	H( i, tp ){
		let r = 0, tn
		/* eslint-disable */
		const N = this.neighi( i )
		for( let j = 0 ; j < N.length ; j ++ ){
			tn = this.C.pixti( N[j] )
			if( tn != tp ) r += this.J( tn, tp )
		}
		return r
	}
}

function initialize(){

	sim = new CPM.Simulation( config, {
		seedCells : seedCells,
		initializeGrid : initializeGrid,	// these functions are defined below
		postMCSListener : postMCSListener,
		updateChemokine : updateChemokine,
		drawCanvas : drawCanvas
	} )
	
	// overwrite the default grid with one with custom neighborhood functions
	sim.C.grid = new CustomGrid( config.field_size, config.conf.torus, config.conf.NbhOrder.sampling )
	sim.C.midpoint = sim.C.grid.midpoint
	sim.C.field_size = sim.C.grid.field_size
	sim.C.pixels = sim.C.grid.pixels.bind(sim.C.grid)
	sim.C.pixti = sim.C.grid.pixti.bind(sim.C.grid)
	sim.C.neighi = sim.C.grid.neighi.bind(sim.C.grid)
	sim.C.extents = sim.C.grid.extents
	
	sim.C.add( new Adhesion2( {J2 : config.conf.J2, order : config.conf.NbhOrder.adhesion }  ))
	//sim.seedCells()
		
	initCanvas()
		
	sim.chemokine = new CPM.Grid2D([sim.C.extents[0],sim.C.extents[1]], config.torus, "Float32")
	chem_config.CH_FIELD = sim.chemokine
	sim.C.add( new ChemotaxisConstraintCI( chem_config 	) )
	
	
	sim.seedCells()
	
	meter = new FPSMeter({left:"auto", right:"5px"})
	step()
}


function initializeGrid(){
	// do nothing, we first want to update the grid
}
function seedCells(){
	
	this.addGridManipulator()	
	
	// regular initialization
	const delta = Math.floor( Math.sqrt( this.conf.NRCELLS[0]))
	const dx = [ Math.floor( this.conf.INNERFIELD[0]  / delta ), Math.floor( this.conf.INNERFIELD[1]  / delta ) ]
	const offset = [ Math.floor( dx[0] / 2 ), Math.floor( dx[1] /2) ]
	
	const buffer = Math.floor( (this.C.extents[0] - this.conf.INNERFIELD[0])/2)

	for( let i = 0; i < delta; i++ ){
		for( let j = 0; j < delta; j++ ){
			const xx = offset[0] + i*dx[0] + buffer
			const yy = offset[1] + j*dx[1] + buffer
			this.gm.seedCellAt( 1, [xx,yy])
		}
	}

}

// called by postMCSListener after every MCS
function updateChemokine( D, alpha, epsilon ){
	
	this.chemokine.diffusion( D ) 
	let update = this.chemokine._pixels.map( (x,i) => {
		const p = ( this.C.pixti(i) > 0 ) ? 1 : 0
		return x + ( alpha * p ) - ( epsilon * x * (1 - p) )
	})
	
	this.chemokine._pixels = update	
	
}

// called after every MCS
function postMCSListener(){

	// chemokine dynamics at Nd steps per MCS
	const Nd = this.C.conf.Nd
	const effectiveDiffusionRate = this.C.conf["D"] / Nd
	const effectiveAlpha = this.C.conf.alpha / Nd
	const effectiveEpsilon = this.C.conf.epsilon / Nd
	
	
	for( let i = 0 ; i <= Nd ; i ++ ){
		this.updateChemokine( effectiveDiffusionRate, effectiveAlpha, effectiveEpsilon )	
	}
	
}

function drawCanvas(){

	//if( this.time % 5 != 0 ) return 
	
	// Add the canvas if required
	if( !this.helpClasses["canvas"] ){ this.addCanvas() }
	this.Cim.clear("ffffff")
	
	if( document.getElementById( "drawField" ).checked ){
		this.Cim.drawField( this.chemokine )
		//this.Cim.drawFieldContour( this.chemokine,5, "FF0000" )
	} 
	if( document.getElementById( "drawCells" ).checked ) this.Cim.drawCells( 1, "aaaaaa")	
	if( document.getElementById( "drawCellBorders" ).checked ) this.Cim.drawCellBorders( -1, "000000")	
	
}

