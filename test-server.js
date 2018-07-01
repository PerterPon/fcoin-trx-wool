
const http = require( 'http' );
const path = require( 'path' );
const fs = require( 'fs' );


const app = http.createServer( ( req, res ) => {
    const file = fs.readFileSync( path.join( __dirname, 'fcoin.html' ), 'utf-8' );
    res.end( file );
} );

app.listen( 9090 );

