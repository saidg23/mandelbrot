//init

let canvas = document.getElementById("canvas");
let buffer = canvas.getContext("2d");
let range = document.getElementById("range");

let image = buffer.createImageData(canvas.width, canvas.height);
let imageCopy = buffer.createImageData(canvas.width, canvas.height);

for(let i = 0; i < image.data.length; i += 4)
{
    image.data[i + 3] = 255;
}

let colors = [
    new RGB(9, 63, 150), 
    new RGB(255, 255, 255), 
    new RGB(255, 246, 76), 
    new RGB(247, 103, 7), 
    new RGB(255, 63, 0),
    new RGB(101, 0, 147),
    new RGB(0, 11, 84),
    new RGB(4, 91, 2),
    new RGB(134, 255, 132)
];

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//main

let override = false;

function update()
{
    buffer.clearRect(0, 0, canvas.width, canvas.height);

    let iterationOffset = Number(range.value);

    if(!zoomIn && !zoomOut && viewMoveDirection.x === 0 && viewMoveDirection.y === 0 && render || override)
    {
        render = false;
        override = false;
        for(let x = 0; x < canvas.width; ++x)
        {
            for(let y = 0; y < canvas.height; ++y)
            {
                let real = viewport / canvas.width * x + viewOffset.x;
                let imaginary = viewport / canvas.height * y + viewOffset.y;

                let location = new Vector(real, imaginary);
                let escapes = false;

                let newLocation = new Vector(0, 0);

                let escapeIteration = 0;

                for(let i = 0; i < maxIterations + iterationOffset; ++i)
                {
                    if(getVecMagnitude(newLocation) > 2)
                    {
                        escapes = true;
                        break;
                    }

                    ++escapeIteration;

                    newLocation = addVector(multiplyAsImaginary(newLocation, newLocation), location);
                }

                if(escapes)
                {
                    let fraction = (Math.sin(escapeIteration) + 1) / 2;
                    let pixelColor = interpolateColors(colors, fraction);

                    let index = (x + y * canvas.width) * 4;
                    image.data[index] = pixelColor.r;
                    image.data[index + 1] = pixelColor.g;
                    image.data[index + 2] = pixelColor.b;
                }
                else
                {
                    let index = (x + y * canvas.width) * 4;
                    image.data[index] = 0;
                    image.data[index + 1] = 0;
                    image.data[index + 2] = 0;
                }
            }
        }

        for(let i = 0; i < image.data.length; ++i)
        {
            imageCopy.data[i] = image.data[i];
        }
    }

    if(zoomIn)
    {
        let zoomFactor = Math.pow(zoomRatio / 1.02, zoomInCount) ;
        let zoomSquare = canvas.width * zoomFactor;

        let posOffset = (canvas.width - zoomSquare) / 2; 

        for(let y = 0; y < canvas.height; y++)
        {
            for(let x = 0; x < canvas.width; ++x)
            {
                let index = (x + y * canvas.width) * 4;
                let copyIndex = ((Math.floor(x * zoomFactor + posOffset)) + (Math.floor(y * zoomFactor + posOffset)) * canvas.width) * 4;

                image.data[index] = imageCopy.data[copyIndex];
                image.data[index + 1] = imageCopy.data[copyIndex + 1];
                image.data[index + 2] = imageCopy.data[copyIndex + 2];
            }
        }
    }
    else if(zoomOut)
    {
        let zoomFactor = Math.pow(zoomRatio / 1.02, zoomOutCount) ;
        let zoomSquare = canvas.width / zoomFactor;

        let posOffset = Math.floor((zoomSquare - canvas.width) / 2); 

        for(let y = 0; y < canvas.height; y++)
        {
            for(let x = 0; x < canvas.width; ++x)
            {
                let index = (x + y * canvas.width) * 4;

                let copyX = Math.floor(x / zoomFactor) - posOffset; 
                let copyY = Math.floor(y / zoomFactor) - posOffset; 
                if(copyX < 0 || copyY < 0 || copyX >= canvas.width || copyY >= canvas.height)
                {
                    image.data[index] = 0;
                    image.data[index + 1] = 0;
                    image.data[index + 2] = 0;
                }
                else
                {
                    let copyIndex = (copyX + copyY * canvas.width) * 4;

                    image.data[index] = imageCopy.data[copyIndex];
                    image.data[index + 1] = imageCopy.data[copyIndex + 1];
                    image.data[index + 2] = imageCopy.data[copyIndex + 2];   
                }
            }
        }
    }
    else if(viewMoveDirection.x !== 0 || viewMoveDirection.y !== 0)
    {
        let sampleOffset = new Vector(0, 0);

        if(viewMoveDirection.x < 0)
            sampleOffset.x = -viewSpeed;
        else if(viewMoveDirection.x > 0)
            sampleOffset.x = viewSpeed;

        if(viewMoveDirection.y < 0)
            sampleOffset.y = -viewSpeed;
        else if(viewMoveDirection.y > 0)
            sampleOffset.y = viewSpeed;

        for(let x = 0; x < canvas.width; ++x)
        {
            for(let y = 0; y < canvas.height; ++y)
            {
                let location = new Vector(x, y);
                let sampleLocation = addVector(location, sampleOffset);

                let index = (x + y * canvas.width) * 4;
                let copyIndex = (sampleLocation.x + sampleLocation.y * canvas.width) * 4;

                if(sampleLocation.x < 0 || sampleLocation.y < 0 || sampleLocation.x >= canvas.width || sampleLocation.y >= canvas.height)
                {
                    image.data[index] = 0;
                    image.data[index + 1] = 0;
                    image.data[index + 2] = 0;
                }
                else
                {
                    image.data[index] = imageCopy.data[copyIndex];
                    image.data[index + 1] = imageCopy.data[copyIndex + 1];
                    image.data[index + 2] = imageCopy.data[copyIndex + 2];
                }
            }
        }

        let temp = image;
        image = imageCopy;
        imageCopy = temp;

        temp = null;
    }
    

    buffer.putImageData(image, 0, 0);
    updateView();

    window.requestAnimationFrame(update);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//view

let maxIterations = 70;
let viewport = 4;
let iterationRatio = viewport/maxIterations;
let viewOffset = new Vector(-2, -2);
let viewMoveDirection = new Vector(0, 0);
let viewSpeed = 3;
let zoomIn = false;
let zoomOut = false;
let zoomRatio = 1.0 - ((4 / canvas.width) / 4);
let totalZoomFactor = 0;
let zoomInCount = 1;
let ZoomOutCount = 1;
let render = true;

function updateView()
{

    if(zoomIn)
    {
        let zoomFactor = zoomRatio / 1.02;
        viewOffset.x += (viewport - viewport * zoomFactor) / 2;
        viewOffset.y += (viewport - viewport * zoomFactor) / 2;
        viewport *= zoomFactor;
        zoomInCount ++;
        totalZoomFactor++;
    }
    else if(zoomOut)
    {
        let zoomFactor = zoomRatio / 1.02;
        viewOffset.x -= (viewport / zoomFactor - viewport) / 2;
        viewOffset.y -= (viewport / zoomFactor - viewport) / 2;
        viewport /= zoomFactor;
        zoomOutCount++;
        totalZoomFactor--;
    }
    else
    {
        viewOffset = addVector(viewOffset, viewMoveDirection);
        zoomOutCount = 1;
        zoomInCount = 1;
    }

    maxIterations = (8 - viewport) / iterationRatio + totalZoomFactor * 1.1;

    if(maxIterations < 70)
        maxIterations = 70;

    if(maxIterations == 70)
        totalZoomFactor = 0;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//vector2

function Vector(x, y)
{
    this.x = x;
    this.y = y;
}

function addVector(a, b)
{
    return new Vector(a.x + b.x, a.y + b.y);
}

function subtractVector(a, b)
{
    return new Vector(a.x - b.x, a.y - b.y);
}

function multiplyAsImaginary(a, b)
{
    let imaginaryProduct = a.y * b.y * -1;
    let x = a.x * b.x + imaginaryProduct;
    let y = a.x * b.y + a.y * b.x;
    return new Vector(x, y);
}

function getVecMagnitude(a)
{
    return Math.sqrt(a.x * a.x + a.y * a.y);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//color

function RGB(r = 0, g = 0, b = 0)
{
    this.r = r;
    this.g = g;
    this.b = b;
}

function interpolateColors(colors, fraction)
{
    let index1 = Math.floor((colors.length - 1) * fraction);
    let index2 = index1 + 1;

    let colorFraction = (colors.length - 1) * fraction - index1;

    let color1 = colors[index1];
    let color2 = colors[index2];

    let r = Math.floor(color1.r + (color2.r - color1.r) * colorFraction);
    let g = Math.floor(color1.g + (color2.g - color1.g) * colorFraction);
    let b = Math.floor(color1.b + (color2.b - color1.b) * colorFraction);

    return new RGB(r, g, b);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Inputs

window.addEventListener("keydown", keyDown);
window.addEventListener("keyup", keyUp);
range.addEventListener("mouseup", updateIteration)

function keyDown(e)
{
    switch(e.code)
    {
        case "ArrowUp":
            viewMoveDirection.y = (-viewport / canvas.width) * viewSpeed;
            break;
        case "ArrowDown":
            viewMoveDirection.y = (viewport / canvas.width) * viewSpeed;
            break;
        case "ArrowLeft":
            viewMoveDirection.x = (-viewport / canvas.height) * viewSpeed;
            break;
        case "ArrowRight":
            viewMoveDirection.x = (viewport / canvas.height) * viewSpeed;
            break;
        case "KeyX":
            zoomIn = true;
            break;
        case "KeyZ":
            zoomOut = true;
            break;
    }

    render = true;
}

function keyUp(e)
{
    switch(e.code)
    {
        case "ArrowUp":
            viewMoveDirection.y = 0;
            break;
        case "ArrowDown":
            viewMoveDirection.y = 0;
            break;
        case "ArrowLeft":
            viewMoveDirection.x = 0;
            break;
        case "ArrowRight":
            viewMoveDirection.x = 0;
            break;
        case "KeyX":
            override = true;
            zoomIn = false;
            break;
        case "KeyZ":
            override = true;
            zoomOut = false;
            break;
    }
}

function updateIteration()
{
    render = true;
}

window.requestAnimationFrame(update);
