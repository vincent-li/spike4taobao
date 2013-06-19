#include "SpamImage.h"
#include "svm-predict.h"
#include <algorithm>
#include <string>
#include <stdio.h>

#ifndef MAX
#define MAX(x,y) (((x) > (y)) ? (x) : (y))
#endif

#ifndef ABS
#define ABS(x) ((x<0) ? (-x) : (x))
#endif

bool x_more_than(const XBlock & m1, const XBlock & m2)
{
	return m1.x < m2.x;
};
void Layout::insert(int i,int x,int y)
{
    layout.insert(std::map<int,Point>::value_type(i,Point(x,y)));
};
void Layout::compute(Config& config,std::map<int,std::string>& lines,std::string& final)
{
	std::map<int,Point>::iterator it;
	std::vector<XBlock> xList;
	//
	int newFile = 1;
	while(layout.size() > 0)
	{
		int startY = -1;
		int startX = -1;
		int startI = -1;
		for(it=layout.begin();it!=layout.end();it++)
		{
			int i = (*it).first;
			Point xy=(*it).second;
			int x=xy.x;
			int y=xy.y;
			if(y > startY || startY == -1)
			{
				startY = y;
				startX = x;
				startI = i;
			}
		}
		//
		for(it=layout.begin();it!=layout.end();it++)
		{
			int i = (*it).first;
			Point xy=(*it).second;
			int x=xy.x;
			int y=xy.y;
		}
		//
		xList.clear();
		for(it=layout.begin();it!=layout.end();it++)
		{			
			int i = (*it).first;
			Point xy=(*it).second;
			int x=xy.x;
			int y=xy.y;
			if(y > startY - 12)
			{
				XBlock xBlock(i,x,y);
				xList.push_back(xBlock);
			}
		}
		//
		std::sort(xList.begin(), xList.end(), x_more_than);
		//
		for(int i=0;i<xList.size();i++)
		{
			XBlock xBlock=xList[i];
			layout.erase(xBlock.i);
			//
			char output='?';
			std::map<int,std::string>::iterator li = lines.find(xBlock.i);
			if(li!=lines.end())
			{
				const char* line = (*li).second.c_str();
				//printf("%s\n",line);
				output = predict_take((char*)line);
				//printf("output1=%c\n",output);
				char temp[2];
				temp[0]=output;
				temp[1]=0;
				final.append(temp);
				//printf("final=%s\n",final.c_str());
			}
			else
			{
				printf("Error case 1\n");
			}
			if(config.trainData)
			{
				char zFile[MAX_PATH];
				sprintf(zFile,"%s\\Z%08d.bmp",config.midstPath,xBlock.i);
				char aFile[MAX_PATH];
				sprintf(aFile,"%s\\A%08d(%c).bmp",config.midstPath,newFile,output);
				rename(zFile,aFile);
				//printf("%s --> %s\n\n",zFile,aFile);
			}
			//
			newFile = newFile + 1;
		}
	}
};

Project::Project(char* fileName)
{
	FILE* fp=fopen(fileName,"r");
	if(!fp)
	{
		printf("Can not load chararters project file.");
		return;
	}
	Charater* oneChar;
	while(true)
	{
		char flag;
		int result = fscanf(fp,"%c",&flag);
		if(result <=0)
		{
			break;
		}
		else
		{
			std::map<char,Charater>::iterator li = chars.find(flag);
			if(li != chars.end())
			{
				oneChar=&((*li).second);
			}
			else
			{
				oneChar=new Charater();
			}
			int size = 0;
			fscanf(fp,"(%d)",&size);
			int data;
			double diff = 0.0;
			std::string line;
			char buff[256];
			for(int i=0;i<size;i++)
			{
				fscanf(fp,"%d:",&data);
				sprintf(buff,"%d",data);
				line.append(buff);
			}			
			//printf("flag=%c  line=%s\n",flag,line.c_str());
			oneChar->lines.push_back(line);
			fscanf(fp,"\n",buff);
		}
		chars.insert(std::map<char,Charater>::value_type(flag,*oneChar));
	}
	if(fp)
	{
		fclose(fp);
		fp=NULL;
	}	
};

RegionGrow::RegionGrow(int maxWidth,int maxHeight)
{
	nMaxWidth = maxWidth;
	nMaxHeight = maxHeight;
	//
	pucRegion = new unsigned char[maxWidth * maxHeight];
	//
	pbMirror = new bool*[maxHeight];
	for(int cy=0;cy<maxHeight;cy++)
	{
		pbMirror[cy] = new bool[maxWidth];
		for(int cx=0;cx<maxWidth;cx++)
		{			
			pbMirror[cy][cx] = true;
		}
	}
	//
	pnGrowQueueX = new int[maxWidth*maxHeight];
	pnGrowQueueY = new int[maxWidth*maxHeight];
};
RegionGrow::~RegionGrow()
{
	delete []pnGrowQueueX;
	delete []pnGrowQueueY;
	pnGrowQueueX = NULL ;
	pnGrowQueueY = NULL ;
	//
	for (int dy=0;dy<nMaxHeight;dy++) 
	{
		delete[] pbMirror[dy];
	}
	delete[] pbMirror;
	//
	delete []pucRegion;
	pucRegion = NULL  ;
};

bool RegionGrow::isNeighbor(RGBQUAD sourceCS,RGBQUAD targetCS,int average)
{
	int sourceGray=(sourceCS.rgbRed+sourceCS.rgbGreen+sourceCS.rgbBlue)/3.0;
	int targetGray=(targetCS.rgbRed+targetCS.rgbGreen+targetCS.rgbBlue)/3.0;	
	if( abs(sourceGray - targetGray) < 256/4 )
	{
		return true;
	}
	else
	{
		return false;
	}
};
void RegionGrow::recognizeSave(std::map<int,std::string> &lines,unsigned char* pUnRegion,int nWidth,int nHeight,int nLeftX,int nLeftY,int nRightX,int nRightY,Config& config,int saveName,char* line)
{
	if(line != NULL)
	{
		sprintf(line,"%d ",saveName);
		int index = 1;
		for(int y=nLeftY;y<=nRightY;y++)
		{
			for(int x=nLeftX;x<=nRightX;x++)
			{
				if(pUnRegion[y*nWidth+x] == 1)
				{
					sprintf(line,"%s%d:%lf ",line,index++,SVM_MAX);
				}
				else
				{
					sprintf(line,"%s%d:%lf ",line,index++,SVM_MIN);
				}
			}
		}
		lines.insert(std::map<int,std::string>::value_type(saveName,line));
	}
    //
	if(config.trainData)
	{
		CxImage image;
		int nWidthROI = nRightX-nLeftX+1;
		int nHeightROI = nRightY-nLeftY+1;
		image.Create(nWidthROI,nHeightROI,24,CXIMAGE_SUPPORT_BMP);
		RGBQUAD rgbSet;
		for(int sy=nLeftY;sy<=nRightY;sy++)
		{
			for(int sx=nLeftX;sx<=nRightX;sx++)
			{
				if(pUnRegion[sy*nWidth+sx] == 1)
				{
					rgbSet.rgbRed=255;
					rgbSet.rgbGreen=0;
					rgbSet.rgbBlue=0;
				}
				else
				{
                    rgbSet.rgbRed=0;
					rgbSet.rgbGreen=0;
					rgbSet.rgbBlue=0;
				}
				image.SetPixelColor(sx-nLeftX,sy-nLeftY,rgbSet);
			}
		}
		char file[MAX_PATH];
		if(line == NULL)
		{
			static int notText = 1;
			sprintf(file,"%s\\N%08d.bmp",config.midstPath,notText++);
		}
		else
		{
		    sprintf(file,"%s\\Z%08d.bmp",config.midstPath,saveName);
		}
		image.Save(file,CXIMAGE_SUPPORT_BMP);
	}
}
void RegionGrow::runRegionGrow(CxImage* cxImage,int nWidth,int nHeight,Config& config,Project &project,std::string& final) 
{
#define ROI_X_LEFT  1
#define ROI_X_RIGHT  1
#define ROI_Y_LEFT  1
#define ROI_Y_RIGHT  1
	
	//static int nDn = 4;
	//static int nDx[]={-1,+0,+1,+0};
	//static int nDy[]={+0,+1,+0,-1};
	
    static int nDn = 8;
	static int nDx[]={-1,+0,+1,+0, -1,-1,+1,+1};
	static int nDy[]={+0,+1,+0,-1, +1,-1,+1,-1};
	
    //static int nDn = 20;
	//static int nDx[]={-1,+0,+1,+0, -1,-1,+1,+1, -2,+2,-2,+2,-2,+2,+0,+0,-1,-1,+1,+2};
	//static int nDy[]={+0,+1,+0,-1, +1,-1,+1,-1, +0,+0,+1,+1,-1,-1,+2,-2,+2,-2,+1,-2};
	
	if(nWidth <= ROI_X_LEFT+ROI_X_RIGHT || nHeight <= ROI_Y_LEFT+ROI_Y_RIGHT)
	{
		printf("The image must be bigger than %d x %d (width * height)!\n",(ROI_X_LEFT+ROI_X_RIGHT),(ROI_Y_LEFT+ROI_Y_RIGHT));
		exit(1);
	}

	int nLocAvg = 0;
	for(int cy=nHeight-ROI_Y_RIGHT;cy>ROI_Y_LEFT;cy--)
	{
		for(int cx=ROI_X_LEFT;cx<nWidth-ROI_X_RIGHT;cx++)
		{
            RGBQUAD rgbCS = cxImage->GetPixelColor(cx,cy);
			RGBQUAD yuvCS = CxImage::RGBtoXYZ(rgbCS); 
			int gray = (yuvCS.rgbRed + yuvCS.rgbGreen + yuvCS.rgbBlue) / 3.0;
			RGBQUAD gryCS;
			gryCS.rgbRed = gray;
			gryCS.rgbGreen = gray;
			gryCS.rgbBlue = gray;
			cxImage->SetPixelColor(cx,cy,gryCS);			
			nLocAvg = nLocAvg + gray;
		}
	}
	nLocAvg /= ( (nHeight-ROI_Y_RIGHT-ROI_Y_LEFT) * (nWidth-ROI_X_RIGHT-ROI_X_LEFT) ) ;

	int nPixel = 0;
	int nLeftX = 0;
	int nLeftY = 0;
	int nRightX = 0;
	int nRightY = 0;
    int debugFile=1;
	std::map<int,std::string> lines;
	
	for(int my=nHeight-ROI_Y_RIGHT;my>ROI_Y_LEFT;my--)
	{
		for(int mx=ROI_X_LEFT;mx<nWidth-ROI_X_RIGHT;mx++)
		{
			if(pbMirror[my][mx])
			{
				memset(pucRegion,0,sizeof(unsigned char)* nWidth * nHeight);
				nPixel = 1;
                nLeftX = mx;
				nLeftY = my;
				nRightX = mx;
				nRightY = my;
				int nStart = 0 ;
				int nEnd   = 0 ;
				pnGrowQueueX[nEnd] = mx;
				pnGrowQueueY[nEnd] = my;
				int nCurrX ;
				int nCurrY ;
				int xx;
				int yy;
				int k ;
				while (nStart<=nEnd)
				{
					nCurrX = pnGrowQueueX[nStart];
					nCurrY = pnGrowQueueY[nStart];
					for (k=0;k<nDn;k++)	
					{	
						xx = nCurrX+nDx[k];
						yy = nCurrY+nDy[k]; 
						if ((xx < nWidth) && (xx>=0) && (yy<nHeight) && (yy>=0) && (pucRegion[yy*nWidth+xx]==0) )
						{
							if(isNeighbor(cxImage->GetPixelColor(xx,yy),cxImage->GetPixelColor(nCurrX,nCurrY),nLocAvg))
							{
								nEnd++;
								pnGrowQueueX[nEnd] = xx;
								pnGrowQueueY[nEnd] = yy;
								pucRegion[yy*nWidth+xx] = 1;
								nPixel++;
								if(xx < nLeftX) 
								{
									nLeftX=xx;
								}
								else if(xx > nRightX)
								{
									nRightX=xx;
								}
								if(yy < nLeftY) 
								{
									nLeftY=yy;
								}
								else if(yy > nRightY)
								{
									nRightY=yy;
								}
                                pbMirror[yy][xx] = false;
								pbMirror[nCurrY][nCurrX] = false;   //FAST
							}
						}
					}
					nStart++;
				}		
				const static int TOO_SMALL = 11;
				const static int TOO_HIGH = 19;
				const static int TOO_SHORT = 6;				
				if(nPixel < TOO_SMALL)   //����̫С
				{
					//printf("xxx: found no-text region case: too small (pixels: %d<%d)\n",nPixel,TOO_SMALL);
					//recognizeSave(lines,pucRegion,nWidth,nHeight,nLeftX,nLeftY,nRightX,nRightY,config,debugFile,NULL);
					continue;
				}
				else if(nRightY-nLeftY > TOO_HIGH)  //̫��
				{
					//printf("xxx: found no-text region case: too high (height: %d>%d)\n",nRightY-nLeftY,TOO_HIGH);
					//recognizeSave(lines,pucRegion,nWidth,nHeight,nLeftX,nLeftY,nRightX,nRightY,config,debugFile,NULL);
					continue;
				}
				else if(nRightY-nLeftY < TOO_SHORT)  //̫��
				{
					//printf("xxx: found no-text region case: too short (height: %d<%d)\n",nRightY-nLeftY,TOO_SHORT);
					//recognizeSave(lines,pucRegion,nWidth,nHeight,nLeftX,nLeftY,nRightX,nRightY,config,debugFile,NULL);
					continue;
				}
				else if( (nRightX-nLeftX) >= (nRightY-nLeftY) * 1.6 )  //�����ڸ�
				{
					//printf("???: found merged block: (%d,%d) --> (%d,%d)\n",nLeftX,nLeftY,nRightX,nRightY);
					//Ԥ��
					int nWidthROI = nRightX-nLeftX+1;
					int nHeightROI = nRightY-nLeftY+1;
					int aLeftY=nLeftY;
					int aRightY=nRightY;
					int aLeftX=nLeftX;
					int aRightX=nLeftX+nHeightROI-1;   // *1.1
					while(true)
					{
						int aW=aRightX-aLeftX+1;
						int aH=aRightY-aLeftY+1;
						char* line = new char[aW*aH*32];
						memset(line, 0, aW*aH*32);
						recognizeSave(lines,pucRegion,nWidth,nHeight,aLeftX,aLeftY,aRightX,aRightY,config,debugFile,line);
						layout.insert(debugFile,nLeftX,nLeftY);
						debugFile = debugFile + 1;
						//ʶ��
						char output = predict_take(line);
						delete line;
						//XͶӰ (������ + ������)
						int* projectX =  new int[aW];
						int* projectXScaled =  new int[aW];
						for(int px1=aLeftX,index=0;px1<=aRightX;px1++,index++)
						{
							projectX[index] = 0;
							for(int py1=aLeftY;py1<=aRightY;py1++)
							{
								if(pucRegion[py1*nWidth+px1] == 1)
								{
									projectX[index] = projectX[index]+1;
								}
							}
							//5-scale
							projectXScaled[index] = (int)( (double)projectX[index] / (double)aH * 5.0 );
						}
						//����
						Charater oneChar;
						std::map<char,Charater>::iterator li = project.chars.find(output);
						if(li != project.chars.end())
						{
							oneChar=(*li).second;			
						}
						int matchedSize = 0;
						double matchedDiff = aW * 5.0;		
						for(int c=0;c<oneChar.lines.size();c++)
						{
							const char* line=oneChar.lines[c].c_str();
							int size=strlen(line);
							double diff = 0.0;
							for(int i=0;i<size && i<aW;i++)
							{
								char temp[2];
								temp[0]=line[i];
								temp[1]=0;
								int data=atoi(temp);
								diff = diff + abs(projectXScaled[i]-data);
								//printf("project=%d  current=%d    diff=%lf\n",projectXScaled[i],data,diff);
							}
							//��Ҫ�������������ۺ��� size/aW, size/matchedSize, diff/matchedDiff
							if(diff < matchedDiff)
							{
								matchedDiff = diff;
								matchedSize = size;
							}
						}
						delete projectXScaled;
						delete projectX;
						//printf("matchedSize=%d  matchedDiff=%lf\n",matchedSize,matchedDiff);
						//
						if(matchedSize == 0)
						{
							matchedSize = nHeightROI;
						}
						aLeftX=aLeftX+matchedSize;
						aRightX=aLeftX+nHeightROI-1;	//*1.1
						if(aLeftX >= nRightX-1)
						{
							break;
						}
						if(aRightX > nRightX)
						{
							aRightX=nRightX;
						}
					}				
				}
				else
				{
					//printf("vvv: found ok-text region case: other condition\n");
					int aW=nRightX-nLeftX+1;
					int aH=nRightY-nLeftY+1;
					char* line = new char[aW*aH*32];
					memset(line, 0, aW*aH*32);					
					RegionGrow::recognizeSave(lines,pucRegion,nWidth,nHeight,nLeftX,nLeftY,nRightX,nRightY,config,debugFile,line);
					layout.insert(debugFile,nLeftX,nLeftY);
					debugFile =  debugFile + 1;
					delete line;
				}
			}
		}
	}
    layout.compute(config,lines,final);
};