
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';
import * as crypto from 'crypto';
import 'colors';
const ethCrypto = require( 'eth-crypto' );

import { Browser, Page, ElementHandle } from 'puppeteer';

let fcoinPage: Page = {} as Page;
let fcoinBrower: Browser = {} as Browser;

const fcoinPort: number = 9090;

let fcoinHtmlServer: http.Server|null = null;

async function ready4FCoinServer(): Promise<void> {

    if ( null !== fcoinHtmlServer )  {
        fcoinHtmlServer.close();
        await sleep( 1 * 1000 );
    }

    const fcoinHtmlPath: string = path.join( __dirname, '../../fcoin.html' );
    const htmlFile: string = fs.readFileSync( fcoinHtmlPath, 'utf-8' );

    const app: http.Server = http.createServer( ( req: http.IncomingMessage, res: http.ServerResponse ) => {
        res.end( htmlFile );
    } );
    app.listen( fcoinPort );
    fcoinHtmlServer = app;
}

async function ready4FcoinPage(): Promise<void> {
    fcoinBrower = await puppeteer.launch();
    fcoinPage = await fcoinBrower.newPage();
    await fcoinPage.setViewport( { width: 1430, height: 600 } );
    await fcoinPage.goto( `http://127.0.0.1:${ fcoinPort }` );
}

function generateUserName(): string {
    const baseName: string = 'f';
    const varName: number = Math.floor( Math.random() * 111111 );
    const hash: crypto.Hash = crypto.createHash( 'md5' );
    hash.update( `${ baseName }_${ varName }` );
    const md5Name: string = hash.digest( 'hex' );
    return md5Name.substr( 0, 6 );
}

function generateEthAddress(): { address: string, publicKey: string, privateKey: string } {
    const res = ethCrypto.createIdentity();
    return {
        address: res.address.toLowerCase(),
        publicKey: res.publicKey,
        privateKey: res.privateKey
    };
}

function generatePhoneNumber(): string {
    const baseNumber: string = '139';
    const rightNumber: number = Math.floor( Math.random() * 100000000 );
    return `${ baseNumber }${ rightNumber }`;
}

function storeEthAddress( address: string, publicKey: string, privateKey: string ): void {
    const listFilePath: string = path.join( __dirname, '../../list.json' );
    const listFile: string = fs.readFileSync( listFilePath, 'utf-8' );
    const list = JSON.parse( listFile );
    list.address[ address ] = { address, publicKey, privateKey };
    fs.writeFileSync( listFilePath, JSON.stringify( list, <any>'', 2 ) );
}

function storeUserName( userName: string, ethAddress: string ): void {
    const listFilePath: string = path.join( __dirname, '../../list.json' );
    const listFile: string = fs.readFileSync( listFilePath, 'utf-8' );
    const list = JSON.parse( listFile );
    list.userName[ userName ] = { userName, ethAddress };
    fs.writeFileSync( listFilePath, JSON.stringify( list, <any> '', 2 ) );
}

async function sleep( time: number ): Promise<void> {
    return new Promise<void>( ( resolve ) => {
        setTimeout( resolve, time );
    } );
}

async function getNewFcoinScreenshot( userName: string, ethAddress: string ): Promise<string> {
    const userNameInput: ElementHandle|null = await fcoinPage.$( '.user-name' );
    const addressInput: ElementHandle|null = await fcoinPage.$( '.eth-address' );
    const btcCountSpan: ElementHandle|null = await fcoinPage.$( '.btc-count' );
    const usdCountSpan: ElementHandle|null = await fcoinPage.$( '.usd-count' );
    const virBtcCount: string = ( Math.random() * 3.9 ).toFixed( 4 );
    const virUsdCount: string = ( +virBtcCount * 5700 ).toFixed( 2 );
    await fcoinPage.evaluate( ( userNameInput: Element, userName: string ) => {
        userNameInput.innerHTML = userName;
    }, userNameInput, userName );
    await fcoinPage.evaluate( ( addressInput: Element, ethAddress: string ) => {
        addressInput.innerHTML = ethAddress;
    }, addressInput, ethAddress );
    await fcoinPage.evaluate( ( btcCountSpan: Element, btcCount: string ) => {
        btcCountSpan.innerHTML = btcCount;
    }, btcCountSpan, virBtcCount );
    await fcoinPage.evaluate( ( usdCountSpan: Element, usdCount: string ) => {
        usdCountSpan.innerHTML = usdCount;
    }, usdCountSpan, virUsdCount )

    const imagePath: string = path.join( __dirname, '../../imgs', `${ userName }-${ ethAddress }.png` );

    await fcoinPage.screenshot( {
        path: imagePath
    } );

    return imagePath;
}

async function fillFormFields( page: Page, userName: string, address: string, phone: string ): Promise<void> {
    const userNameInput: ElementHandle | null = await page.$( 'div[data-label="Fcoin用户名"] input' );
    const addressInput: ElementHandle | null = await page.$( 'div[data-label="Fcoin创新版地址"] input' );
    const phoneInput: ElementHandle|null = await page.$( 'div[data-label="手机号"] input' );

    await page.evaluate( ( userNameInput: HTMLInputElement, userName: string, addressInput: HTMLInputElement, address: string, phoneInput: HTMLInputElement, phone: string ) => {
        userNameInput.value = userName;
        addressInput.value = address;
        phoneInput.value = phone;
    }, userNameInput, userName, addressInput, address, phoneInput, phone );
}

async function playPage( browser: Browser ): Promise<void> {
    const context = await browser.createIncognitoBrowserContext();
    const page: Page = await context.newPage();
    await page.goto( 'https://jinshuju.net/f/jW25Tx/' );

    const { address, publicKey, privateKey } = generateEthAddress();
    const userName: string = generateUserName();

    storeEthAddress( address, publicKey, privateKey );
    storeUserName( userName, address );
    const phoneNumber: string = generatePhoneNumber();
    console.log( `start new user: [${ userName }], eth address: [${ address }], phone number: [${ phoneNumber }]` );
    const imgPath: string = await getNewFcoinScreenshot( userName, address );

    const inputFile: ElementHandle|null = await page.$( 'input[type=file]' );
    if ( null === inputFile ) {
        throw new Error( 'input element do not found!' );
    }
    console.log( `uploading img: [${ imgPath }]` );
    await inputFile.uploadFile( imgPath );
    await page.waitFor( 2 * 1000 );
    page.waitForSelector( 'div[data-label="创业版地址截图"] .attachment', {
        visible: true,
        timeout: 5 * 1000
    } )
    console.log( 'upload success!'.green );

    await fillFormFields( page, userName, address, phoneNumber );
    console.log( 'fill all filed done!' );
    console.log( 'going to second page...' );
    const nextPageButton: ElementHandle|null = await page.$( '.next-page' );
    if ( null === nextPageButton ) {
        throw new Error( 'next button was null' );
    }
    await nextPageButton.click();

    await page.waitForSelector( 'input[type="submit"]', {
        visible: true,
        timeout : 5 * 1000
    } );
    await sleep( 1 * 1000 );
    console.log( 'submiting ....' );
    const submitButton: ElementHandle|null = await page.$( 'input[type="submit"]' );
    if ( null === submitButton ) {
        throw new Error( 'submit button was null!' );
    }

    await submitButton.click();
    await page.waitForSelector( '.gd-icon-check-circle', {
        visible: true
    } );
    await sleep( 1 * 1000 );

    console.log( 'successfully woolen new coin! waiting next...'.green );
    await page.close();
    await context.close();
}

async function letUsPlay(): Promise<void> {

    while( true ) {
        await playPage( fcoinBrower );
        await sleep( 5 * 1000 );
    }

}

async function start() {
    await ready4FCoinServer();
    console.log( 'fcoin html server ready!'.green );
    await ready4FcoinPage();
    console.log( 'fcoin html page ready!'.green );

    await letUsPlay();
}

start();

process.on( 'uncaughtException', ( error: Error ) => {
    console.log( error );
    console.log( 'restarting' );
    setTimeout( start, 5 * 1000 );
} );

process.on( 'unhandledRejection', ( reason: string ) => {
    console.log( reason );
    console.log( 'restarting...' );
    setTimeout( start, 5 * 1000 );
} );
