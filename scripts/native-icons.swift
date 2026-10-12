import AppKit
import Foundation
let root=FileManager.default.currentDirectoryPath
func image(_ size:Int,_ output:String,_ foreground:Bool=false){
 let b=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:size,pixelsHigh:size,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:b)
 let scale=Double(size)/64
 if !foreground{NSColor(calibratedRed:16/255,green:37/255,blue:51/255,alpha:1).setFill();NSBezierPath(rect:NSRect(x:0,y:0,width:size,height:size)).fill()}
 NSColor(calibratedRed:185/255,green:223/255,blue:247/255,alpha:1).setFill()
 let start=foreground ? 19.0 : 14.0, extent=foreground ? 26.0 : 36.0
 NSBezierPath(rect:NSRect(x:27*scale,y:start*scale,width:10*scale,height:extent*scale)).fill()
 NSBezierPath(rect:NSRect(x:start*scale,y:27*scale,width:extent*scale,height:10*scale)).fill()
 NSGraphicsContext.restoreGraphicsState();let data=b.representation(using:.png,properties:[:])!;try! data.write(to:URL(fileURLWithPath:root+"/"+output))
}
image(1024,"ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png")
for (density,size) in [("mdpi",48),("hdpi",72),("xhdpi",96),("xxhdpi",144),("xxxhdpi",192)]{
 for name in ["ic_launcher","ic_launcher_round"]{image(size,"android/app/src/main/res/mipmap-\(density)/\(name).png")}
 image(size*9/4,"android/app/src/main/res/mipmap-\(density)/ic_launcher_foreground.png",true)
}
print("Northline native icons generated")

func splash(_ width:Int,_ height:Int,_ output:String){
 let b=NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:width,pixelsHigh:height,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
 NSGraphicsContext.saveGraphicsState();NSGraphicsContext.current=NSGraphicsContext(bitmapImageRep:b)
 NSColor(calibratedRed:16/255,green:37/255,blue:51/255,alpha:1).setFill();NSBezierPath(rect:NSRect(x:0,y:0,width:width,height:height)).fill()
 let unit=Double(min(width,height))/20,cx=Double(width)/2,cy=Double(height)/2
 NSColor(calibratedRed:185/255,green:223/255,blue:247/255,alpha:1).setFill()
 NSBezierPath(rect:NSRect(x:cx-unit/2,y:cy-unit*2,width:unit,height:unit*4)).fill()
 NSBezierPath(rect:NSRect(x:cx-unit*2,y:cy-unit/2,width:unit*4,height:unit)).fill()
 NSGraphicsContext.restoreGraphicsState();try! b.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:root+"/"+output))
}
for file in ["splash-2732x2732.png","splash-2732x2732-1.png","splash-2732x2732-2.png"]{splash(2732,2732,"ios/App/App/Assets.xcassets/Splash.imageset/"+file)}
let androidRes=root+"/android/app/src/main/res"
for case let url as URL in FileManager.default.enumerator(at:URL(fileURLWithPath:androidRes),includingPropertiesForKeys:nil)! where url.lastPathComponent=="splash.png" {
 let old=NSImage(contentsOf:url)!,rep=NSBitmapImageRep(data:old.tiffRepresentation!)!
 splash(rep.pixelsWide,rep.pixelsHigh,String(url.path.dropFirst(root.count+1)))
}
print("Northline launch screens generated")
