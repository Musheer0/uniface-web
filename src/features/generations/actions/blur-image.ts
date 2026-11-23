import { BlurMethod } from "@blurfield/js"
import { blurrfield } from "../../../lib/blurrfiled-client"
import { TRPCError } from "@trpc/server";
export const blurImage = async(
  input:{inputKey:string, 
  outputKey:string,
  faceId?:string|null,
    user_id:string,
    blurMethod:BlurMethod,
    generationId:string
}
)=>{
  if(input.faceId){
   try {
    const response = await blurrfield.blurPhotoEveryoneFiltered({
    user_id:input.user_id,
    blur_method:input.blurMethod as any ,
    face_key:input.faceId,
    generation_id:input.generationId,
    img_key:input.inputKey,
    output_key:input.outputKey
   });
   if(!response.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:response.error||"Somthing went wrong please try again"
    })
   }
   return response
   } catch (error) {
    console.error("[error generation image",error);
    throw new TRPCError({code:"INTERNAL_SERVER_ERROR"})
   }
  }
    try {
    const response = await blurrfield.blurPhotoEveryone({
    user_id:input.user_id,
    blur_method:input.blurMethod as any ,
    generation_id:input.generationId,
    img_key:input.inputKey,
    output_key:input.outputKey
   });
   if(!response.success) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:response.error||"Somthing went wrong please try again"
    })
   }
   return response
   } catch (error) {
    console.error("[error generation image",error);
    throw new TRPCError({code:"INTERNAL_SERVER_ERROR"})
   }
}