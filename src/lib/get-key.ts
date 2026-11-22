export const getKey = ({
upload_type,userId,file_name,media_id,face
}:{
    userId:string
    file_name:string,
    upload_type:"user"|"generation",
    media_id:string,
    face?:boolean
})=>{
     let key = `users/${userId}/${face? "face":"media"}/${upload_type}/${media_id}/${file_name}`
     return key
}