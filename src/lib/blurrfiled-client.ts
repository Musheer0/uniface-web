import {createBlurfieldClient,BlurMethod} from '@blurfield/js'
export const blurrfield = createBlurfieldClient({
  baseUrl:process.env.BACKEND_URL,
   apiKey: process.env.BLURFIELD_API_KEY
})
