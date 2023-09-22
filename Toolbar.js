import { UIPanel, UIButton, UICheckbox } from './libs/ui.js';

function Toolbar( signals ) {

	const strings = {

		'toolbar/translate': 'Translate',
		'toolbar/rotate': 'Rotate',
		'toolbar/scale': 'Scale',
		'toolbar/local': 'Local',
		'toolbar/editPoints': 'Edit Points',
	};

	const container = new UIPanel();
	container.setId( 'toolbar' );

	// translate / rotate / scale

	const translateIcon = document.createElement( 'img' );
	translateIcon.title = strings[ 'toolbar/translate' ];
	translateIcon.src = 'images/translate.svg';

	const translate = new UIButton();
	translate.dom.className = 'Button selected';
	translate.dom.appendChild( translateIcon );
	translate.onClick( function () {

		signals.transformModeChanged.dispatch( 'translate' );

	} );
	container.add( translate );

	const rotateIcon = document.createElement( 'img' );
	rotateIcon.title = strings[ 'toolbar/rotate' ];
	rotateIcon.src = 'images/rotate.svg';

	const rotate = new UIButton();
	rotate.dom.appendChild( rotateIcon );
	rotate.onClick( function () {

		signals.transformModeChanged.dispatch( 'rotate' );

	} );
	container.add( rotate );

	const scaleIcon = document.createElement( 'img' );
	scaleIcon.title = strings[ 'toolbar/scale' ];
	scaleIcon.src = 'images/scale.svg';

	const scale = new UIButton();
	scale.dom.appendChild( scaleIcon );
	scale.onClick( function () {

		signals.transformModeChanged.dispatch( 'scale' );

	} );
	container.add( scale );

	const local = new UICheckbox( false );
	local.dom.title = strings[ 'toolbar/local' ];
	local.onChange( function () {

		signals.spaceChanged.dispatch( this.getValue() === true ? 'local' : 'world' );

	} );
	container.add( local );


	const editPoints = new UICheckbox( false );
	editPoints.dom.title = strings[ 'toolbar/editPoints' ];
	editPoints.onChange( function () {

		signals.editPointsChanged.dispatch( this.getValue() );

	} );
	container.add( editPoints );

	//

	signals.transformModeChanged.add( function ( mode ) {

		translate.dom.classList.remove( 'selected' );
		rotate.dom.classList.remove( 'selected' );
		scale.dom.classList.remove( 'selected' );

		switch ( mode ) {

			case 'translate': translate.dom.classList.add( 'selected' ); break;
			case 'rotate': rotate.dom.classList.add( 'selected' ); break;
			case 'scale': scale.dom.classList.add( 'selected' ); break;

		}

	} );

	return container;

}

export { Toolbar };
