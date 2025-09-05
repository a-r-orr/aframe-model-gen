# A-Frame Model Generation Environment
This web app provides an environment for generating 3D models from either text or image prompts.
The environment is accessible via either a desktop interface or through a VR headset.

## Usage
No pre-requisites for this front-end are required, simply download the code and either deploy to a web service or run it locally using something like Live Server in VSCode.
The generation functionality will only work if you have also implemented the APIs found in these two repos:

https://github.com/a-r-orr/diffusion-api

https://github.com/a-r-orr/trellis-api

Once you have these running either locally or hosted, simply update the API URLs in config.js to target them correctly.

## Licence
My code is free to use, but the APIs both have more detailed licences for the ML models they use, please see those repos for more details.