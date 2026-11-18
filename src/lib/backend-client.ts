import {createBlurfieldClient,BlurMethod} from '@blurfield/js'
export const blurrfield = createBlurfieldClient({
  baseUrl:process.env.BACKEND_URL
})

export const blur_methods = [
  "blackout",
  "elliptical",
  "gaussian",
  "median",
  "pixelate",
] as const satisfies readonly BlurMethod[];