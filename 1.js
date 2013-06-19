//SuperImage.h

#ifndef _SUPER_IMAGE_
#define _SUPER_IMAGE_

typedef short Pixel;

//
template <class T> 
class SuperImage 
{ 
public:
	SuperImage(const int w, const int h);
	~SuperImage();
public:
	T* data;
	int width;
	int height;
};

//

class EnhancedImage
{
public:
	SuperImage<Pixel>* superImage;
public:
	EnhancedImage();
	~EnhancedImage();
	int load(const char* name);
	int save(const char* name);
	int copy(EnhancedImage* copy);
	int film(EnhancedImage* film);
	int binv();
	int otsu();
	int line();
	int roii();
	int trac();
	int edge();
	int thin();
	int tidy();	
	int kerf();	
	int join();
};

#endif

//SuperImage.cpp
#include "superImage.h"
#include "ximage.h"

template <class T> 
SuperImage<T>::SuperImage(const int w, const int h) 
{
	width = w;
	height = h;
	data = new T[w * h];
};

template <class T> 
SuperImage<T>::~SuperImage() 
{
	if(data)
	{
		delete[] data; 
	}
};

EnhancedImage::EnhancedImage()
{
	superImage=NULL;
};

EnhancedImage::~EnhancedImage()
{
	if(superImage)
	{
		delete superImage;
	}
};

int EnhancedImage::load(const char* name)
{
	CxImage input;
    input.Load(name, CXIMAGE_SUPPORT_J2K);	
	if(!input.IsValid())
	{
		return 1;
	}
	else
	{
		int h=input.GetHeight();
		int w=input.GetWidth();		
		superImage = new SuperImage<Pixel>(w,h);
		for(int y=0;y<h;y++)
		{
			for(int x=0;x<w;x++)
			{
				RGBQUAD rgbQUAD = CxImage::RGBtoXYZ(input.GetPixelColor(x,y));
				Pixel pixel = 255;
				if(true)
				{
					pixel = (rgbQUAD.rgbRed + rgbQUAD.rgbGreen + rgbQUAD.rgbBlue) / 3.0;
				}
				else
				{
                	double yy = (0.299 * rgbQUAD.rgbRed + 0.587 * rgbQUAD.rgbGreen + 0.114 * rgbQUAD.rgbBlue) / 256.0;
	                pixel = (int) (219.0 * yy + 16.5);
				}
				superImage->data[y*w+x]=pixel;
			}
		}
	}
    return 0;
};

int EnhancedImage::save(const char* name)
{
	CxImage output;
	output.Create(superImage->width,superImage->height,24,CXIMAGE_SUPPORT_BMP);  //1 4 8 24
	for(int y=0;y<superImage->height;y++)
	{
		for(int x=0;x<superImage->width;x++)
		{			
			Pixel pixel = superImage->data[y*superImage->width + x];
			RGBQUAD rgbQUAD;
			if(pixel == -1)
			{
				rgbQUAD.rgbRed = 255;
				rgbQUAD.rgbGreen = 0;
				rgbQUAD.rgbBlue = 0;
			}
			else if(pixel == -2)
			{
				rgbQUAD.rgbRed = 0;
				rgbQUAD.rgbGreen = 255;
				rgbQUAD.rgbBlue = 0;
			}
			else if(pixel == -3)
			{
				rgbQUAD.rgbRed = 0;
				rgbQUAD.rgbGreen = 0;
				rgbQUAD.rgbBlue = 255;
			}
			else
			{
				rgbQUAD.rgbRed = pixel;
				rgbQUAD.rgbGreen = pixel;
				rgbQUAD.rgbBlue =pixel;
			}
			output.SetPixelColor(x,y,rgbQUAD);
		}
	}
	output.Save(name,CXIMAGE_SUPPORT_BMP);
    return 0;
};
int EnhancedImage::copy(EnhancedImage* copy)
{
	int w = copy->superImage->width;
	int h = copy->superImage->height;	
	short* cpy = copy->superImage->data;
	//
	this->superImage = new SuperImage<Pixel>(w,h);
	short* tgt = this->superImage->data;
	//
	for (int y=0; y<h; y++) 
	{
		for (int x=0; x<w; x++) 
		{
			tgt[w*(y)+(x)] = cpy[w*(y)+(x)];
		}
	}
	return 0;
}
int EnhancedImage::film(EnhancedImage* film)
{
	int h = film->superImage->height;
	int w = film->superImage->width;
	short* flm = film->superImage->data;
	short* tgt = this->superImage->data;
	//
	for (int y=0; y<h; y++) 
	{
		for (int x=0; x<w; x++) 
		{
			unsigned char source = flm[w*(y)+(x)];
			unsigned char target = tgt[w*(y)+(x)];	
			if(source < 0 || target < 0)
			{
                printf("x=%d  y=%d    src=%d  tgt=%d\n",x,y,source,target);
			}
			if(source==0 && target == 255)
			{
				tgt[w*(y)+(x)] = source;
			}
		}
	}
	return 0;
}
int EnhancedImage::binv()
{
	int threshold = 256 / 8 * 7;
	for(int y2=0;y2<superImage->height;y2++)
	{
		for(int x2=0;x2<superImage->width;x2++)
		{			
			Pixel pixel = superImage->data[y2*superImage->width+x2];
			if(pixel>=threshold)
			{
				superImage->data[y2*superImage->width+x2] = 255;
			}
			else
			{
				superImage->data[y2*superImage->width+x2] = 0;
			}
		}
	}
	return 0;
};

int EnhancedImage::otsu()
{
	int ihist[256];
	memset(ihist, 0, sizeof(ihist));	
	int gmin=255;
	int gmax=0;
	for (int y=0; y<superImage->height; y++) 
	{
		for (int x=0; x<superImage->width; x++) 
		{
			unsigned char point = superImage->data[y*superImage->width+x];
			ihist[point]++;
			if(point > gmax) 
			{
				gmax=point;
			}
			if(point < gmin) 
			{
				gmin=point;
			}
		}
	}	
	double sum = 0.0;
	int n = 0;	
	for (int k = 0; k <= 255; k++) 
	{
		sum += (double) k * (double) ihist[k];    // x*f(x) ������
		n   += ihist[k];                          // f(x) ����
	}	
	// do the otsu global thresholding method
	int threshold = 127;
	double fmax = -1.0;
	int n1 = 0;
	double csum = 0.0;
	for (k = 0; k < 255; k++) 
	{
		n1 += ihist[k];
		if (!n1) 
		{ 
			continue; 
		}
		int n2 = n - n1;
		if (n2 == 0) 
		{ 
			break; 
		}
		csum += (double) k *ihist[k];
		int m1 = csum / n1;
		int m2 = (sum - csum) / n2;
		int sb = (double) n1 *(double) n2 *(m1 - m2) * (m1 - m2);
		//note: can be optimized.
		if (sb > fmax) 
		{
			fmax = sb;
			threshold = k;
		}
	}
	//
	for(int y2=0;y2<superImage->height;y2++)
	{
		for(int x2=0;x2<superImage->width;x2++)
		{			
			Pixel pixel = superImage->data[y2*superImage->width+x2];
			if(pixel>threshold)
			{
				superImage->data[y2*superImage->width+x2] = 255;
			}
			else
			{
				superImage->data[y2*superImage->width+x2] = 0;
			}
		}
	}
	return 0;
};

/*************************************************************************
 *
 * �������ƣ�
 *   Hough()
 *
 * ����:
 *   LPSTR lpDIBBits    - ָ��ԴDIBͼ��ָ��
 *   LONG  lWidth       - Դͼ�����ȣ���������������4�ı�����
 *   LONG  lHeight      - Դͼ���߶ȣ���������
 * ����ֵ:
 *   BOOL               - �����ɹ�����TRUE�����򷵻�FALSE��
 *
 * ˵��:
 * �ú������ڶԼ���ͼ���е�ƽ��ֱ�ߡ�����ͼ����������ƽ�е�ֱ�ߣ�����������ƽ��ֱ��
 * ��ȡ������
 * 
 * Ҫ��Ŀ��ͼ��Ϊֻ��0��255�����Ҷ�ֵ�ĻҶ�ͼ����
 ************************************************************************/

// �ڼ���ͼ����Сʱ�����ù�ʽ��biSizeImage = biWidth' �� biHeight��
// ��biWidth'��������biWidth��������biWidth'������4������������ʾ
// ���ڻ�����biWidth�ģ���4��������������WIDTHBYTES������������
// biWidth'
#define WIDTHBYTES(bits)    (((bits) + 31) / 32 * 4)
#define pi 3.1415927
typedef struct{
	int Value;
	int Dist;
	int AngleNumber;
}MaxValue;
int EnhancedImage::line()
{
	//
	LONG lWidth = superImage->width;
	LONG lHeight = superImage->height;
	//
	LPSTR lpDIBBits = (char *)LocalAlloc(LHND, lWidth * lHeight);
	if (lpDIBBits == NULL)
	{
		return false ;
	}	
	lpDIBBits = (char *)LocalLock(lpDIBBits);
	//
	for (int y=0; y<superImage->height; y++) 
	{
		for (int x=0; x<superImage->width; x++) 
		{
			unsigned char point = superImage->data[y*superImage->width+x];            
			lpDIBBits[lWidth * y + x] = point; 
		}
	}
	//		
	//
	// ָ��Դͼ����ָ��
	LPSTR	lpSrc;
	// ָ�򻺴�ͼ����ָ��
	LPSTR	lpDst;
	// ָ���任����ָ��
	LPSTR   lpTrans;
	// ͼ��ÿ�е��ֽ���
	LONG lLineBytes;
	// ָ�򻺴�DIBͼ����ָ��
	LPSTR	lpNewDIBBits;
	HLOCAL	hNewDIBBits;
	//ָ���任����ָ��
	LPSTR	lpTransArea;
	HLOCAL	hTransArea;
	//�任���ĳߴ�
	int iMaxDist;
	int iMaxAngleNumber;
	//�任��������
	int iDist;
	int iAngleNumber;
	//ѭ������
	long i;
	long j;
	//����ֵ
	unsigned char pixel;
	//�洢�任���е���������ֵ
	MaxValue MaxValue1;
	MaxValue MaxValue2;
	// ��ʱ�����ڴ棬�Ա�����ͼ��
	hNewDIBBits = LocalAlloc(LHND, lWidth * lHeight);
	if (hNewDIBBits == NULL)
	{
		// �����ڴ�ʧ��
		return FALSE;
	}
	// �����ڴ�
	lpNewDIBBits = (char * )LocalLock(hNewDIBBits);
	// ��ʼ���·������ڴ棬�趨��ʼֵΪ255
	lpDst = (char *)lpNewDIBBits;
	memset(lpDst, (BYTE)255, lWidth * lHeight);
	//�����任���ĳߴ�
	//��������
	iMaxDist = (int) sqrt(lWidth*lWidth + lHeight*lHeight);
	//�Ƕȴ�0��180��ÿ��2��
	iMaxAngleNumber = 90;
	//Ϊ�任�������ڴ�
	hTransArea = LocalAlloc(LHND, lWidth * lHeight * sizeof(int));
	if (hNewDIBBits == NULL)
	{
		// �����ڴ�ʧ��
		return FALSE;
	}
	// �����ڴ�
	lpTransArea = (char * )LocalLock(hTransArea);
	// ��ʼ���·������ڴ棬�趨��ʼֵΪ0
	lpTrans = (char *)lpTransArea;
	memset(lpTrans, 0, lWidth * lHeight * sizeof(int));
	// ����ͼ��ÿ�е��ֽ���
	for(j = 0; j <lHeight; j++)
	{
		for(i = 0;i <lWidth; i++)
		{
			// ָ��Դͼ��������j�У���i�����ص�ָ��			
			lpSrc = (char *)lpDIBBits + lWidth * j + i;
			//ȡ�õ�ǰָ�봦������ֵ��ע��Ҫת��Ϊunsigned char��
			pixel = (unsigned char)*lpSrc;
			//Ŀ��ͼ���к���0��255���������Ҷ�ֵ
			if(pixel != 255 && *lpSrc != 0)
				return FALSE;
			//�����Ǻڵ㣬���ڱ任���Ķ�Ӧ�����ϼ�1
			if(pixel == 0)
			{
				//ע�ⲽ����2��
				for(iAngleNumber=0; iAngleNumber<iMaxAngleNumber; iAngleNumber++)
				{
					iDist = (int) fabs(i*cos(iAngleNumber*2*pi/180.0) + j*sin(iAngleNumber*2*pi/180.0));
					//�任���Ķ�Ӧ���ϼ�1
					*(lpTransArea+iDist*iMaxAngleNumber+iAngleNumber) = *(lpTransArea+iDist*iMaxAngleNumber+iAngleNumber) +1;
				}
			}
		}
	}
	//�ҵ��任���е���������ֵ��
	MaxValue1.Value=0;
	MaxValue2.Value=0;
	//�ҵ���һ������ֵ��
	for (iDist=0; iDist<iMaxDist;iDist++)
	{
		for(iAngleNumber=0; iAngleNumber<iMaxAngleNumber; iAngleNumber++)
		{
			if((int)*(lpTransArea+iDist*iMaxAngleNumber+iAngleNumber)>MaxValue1.Value)
			{
				MaxValue1.Value = (int)*(lpTransArea+iDist*iMaxAngleNumber+iAngleNumber);
				MaxValue1.Dist = iDist;
				MaxValue1.AngleNumber = iAngleNumber;
			}
		}
	}
	//����һ������ֵ�㸽������
	for (iDist = -9;iDist < 10;iDist++)
	{
		for(iAngleNumber=-1; iAngleNumber<2; iAngleNumber++)
		{
			if(iDist+MaxValue1.Dist>=0 && iDist+MaxValue1.Dist<iMaxDist && iAngleNumber+MaxValue1.AngleNumber>=0 && iAngleNumber+MaxValue1.AngleNumber<=iMaxAngleNumber)
			{
				*(lpTransArea+(iDist+MaxValue1.Dist)*iMaxAngleNumber+(iAngleNumber+MaxValue1.AngleNumber))=0;
			}
		}
	}
	//�ҵ��ڶ�������ֵ��
	for (iDist=0; iDist<iMaxDist;iDist++)
	{
		for(iAngleNumber=0; iAngleNumber<iMaxAngleNumber; iAngleNumber++)
		{
			if((int)*(lpTransArea+iDist*iMaxAngleNumber+iAngleNumber)>MaxValue2.Value)
			{
				MaxValue2.Value = (int)*(lpTransArea+iDist*iMaxAngleNumber+iAngleNumber);
				MaxValue2.Dist = iDist;
				MaxValue2.AngleNumber = iAngleNumber;
			}
		}
	}
	//�ж���ֱ���Ƿ�ƽ��
	if(abs(MaxValue1.AngleNumber-MaxValue2.AngleNumber)<=2)
	{
		//��ֱ��ƽ�У��ڻ���ͼ�����ػ�������ֱ��
		for(j = 0; j <lHeight; j++)
		{
			for(i = 0;i <lWidth; i++)
			{	
				// ָ�򻺴�ͼ��������j�У���i�����ص�ָ��			
				lpDst = (char *)lpNewDIBBits + lLineBytes * j + i;	
				//�����õ���ĳһ��ƽ��ֱ���ϣ����ڻ���ͼ���Ͻ��õ㸳Ϊ��
				//�ڵ�һ��ֱ����
				iDist = (int) fabs(i*cos(MaxValue1.AngleNumber*2*pi/180.0) + j*sin(MaxValue1.AngleNumber*2*pi/180.0));
				if (iDist == MaxValue1.Dist)
					*lpDst = (unsigned char)0;
				//�ڵڶ���ֱ����
				iDist = (int) fabs(i*cos(MaxValue2.AngleNumber*2*pi/180.0) + j*sin(MaxValue2.AngleNumber*2*pi/180.0));
				if (iDist == MaxValue2.Dist)
					*lpDst = (unsigned char)0;
			}
		}
	}
	// ���Ƹ�ʴ����ͼ��
	memcpy(lpDIBBits, lpNewDIBBits, lWidth * lHeight);
	// �ͷ��ڴ�
	LocalUnlock(hNewDIBBits);
	LocalFree(hNewDIBBits);
	// �ͷ��ڴ�
	LocalUnlock(hTransArea);
	LocalFree(hTransArea);
	//
	//
	for (int yy=0; yy<superImage->height; yy++) 
	{
		for (int xx=0; xx<superImage->width; xx++) 
		{
			unsigned char point = lpDIBBits[lWidth * yy + xx];            
            superImage->data[yy*superImage->width+xx] = point; 
		}
	}
	//
	LocalUnlock(lpDIBBits);
	LocalFree(lpDIBBits);
	// ����
	return TRUE;
}
int EnhancedImage::roii()
{
    int minX = superImage->width;
	int minY = superImage->height;
	int maxX = 0;
	int maxY = 0;
	//
	for (int y=0; y<superImage->height; y++) 
	{
		for (int x=0; x<superImage->width; x++) 
		{
			unsigned char point = superImage->data[y*superImage->width+x];
			if(point==0)
			{
				if(x<minX)
				{
					minX = x;					
				}
				if(y<minY)
				{
                    minY = y;
				}
				//
				if(x>maxX)
				{
					maxX = x;
				}
				if(y>maxY)
				{
					maxY = y;
				}
			}
		}
	}
	//
	if(minX>maxX)
	{
		minX=maxX=0;
	}
	if(minY>maxY)
	{
		minY=maxY=0;
	}
	//
	if(minX>0)
		minX = minX -1;
	if(minY>0)
		minY = minY -1;
	if(maxX<superImage->width-1)
		maxX= maxX+1;
	if(maxY<superImage->height-1)
		maxY = maxY+1;
	//
	int tmpW = maxX - minX+1;
	int tmpH = maxY - minY+1;
	SuperImage<Pixel>* tmpD = new SuperImage<Pixel>(tmpW,tmpH);
	//
	for(int y2=minY,y3=0;y3<tmpH;y2++,y3++)
	{
		for(int x2=minX,x3=0;x3<tmpW;x2++,x3++)
		{			
			Pixel pixel = superImage->data[y2*superImage->width+x2];
			tmpD->data[y3*tmpW+x3] = pixel;
		}
	}
	//
	if(superImage)
	{
		delete superImage;
		superImage = NULL;
	}
	//
	superImage = tmpD;
	//
	return 0;
};
/*************************************************************************
 *
 * �������ƣ�
 *   TraceDIB()
 *
 * ����:
 *   LPSTR lpDIBBits    - ָ��ԴDIBͼ��ָ��
 *   LONG  lWidth       - Դͼ�����ȣ���������������4�ı�����
 *   LONG  lHeight      - Դͼ���߶ȣ���������
 * ����ֵ:
 *   BOOL               - �����ɹ�����TRUE�����򷵻�FALSE��
 *
 * ˵��:
 * �ú������ڶ�ͼ�����������������㡣
 * 
 * Ҫ��Ŀ��ͼ��Ϊֻ��0��255�����Ҷ�ֵ�ĻҶ�ͼ����
 ************************************************************************/
int EnhancedImage::trac()
{
	typedef struct
	{
		int Height;
		int Width;
	}Point;
	//
	LONG lWidth = superImage->width;
	LONG lHeight = superImage->height;
	//
	LPSTR lpDIBBits = (char *)LocalAlloc(LHND, lWidth * lHeight);
	if (lpDIBBits == NULL)
	{
		return false ;
	}	
	lpDIBBits = (char *)LocalLock(lpDIBBits);
	//
	for (int y=0; y<superImage->height; y++) 
	{
		for (int x=0; x<superImage->width; x++) 
		{
			unsigned char point = superImage->data[y*superImage->width+x];            
			lpDIBBits[lWidth * y + x] = point; 
		}
	}
	//		
	//
	// ָ��Դͼ����ָ��
	LPSTR	lpSrc;
	// ָ�򻺴�ͼ����ָ��
	LPSTR	lpDst;
	// ָ�򻺴�DIBͼ����ָ��
	LPSTR	lpNewDIBBits;
	HLOCAL	hNewDIBBits;

	//ѭ������
	long i;
	long j;
	//����ֵ
	unsigned char pixel;
	//�Ƿ��ҵ���ʼ�㼰�ص���ʼ��
	bool bFindStartPoint;
	//�Ƿ�ɨ�赽һ���߽���
	bool bFindPoint;
	//��ʼ�߽����뵱ǰ�߽���
	Point StartPoint,CurrentPoint;
	//�˸���������ʼɨ�跽��
	int Direction[8][2]={{-1,1},{0,1},{1,1},{1,0},{1,-1},{0,-1},{-1,-1},{-1,0}};
	int BeginDirect;
	// ͼ��ÿ�е��ֽ���
	//LONG lLineBytes;
	// ����ͼ��ÿ�е��ֽ���
	//lLineBytes = WIDTHBYTES(lWidth * 8);
	// ��ʱ�����ڴ棬�Ա�����ͼ��
	hNewDIBBits = LocalAlloc(LHND, lWidth * lHeight);
	if (hNewDIBBits == NULL)
	{
		// �����ڴ�ʧ��
		return FALSE;
	}
	// �����ڴ�
	lpNewDIBBits = (char * )LocalLock(hNewDIBBits);
	// ��ʼ���·������ڴ棬�趨��ʼֵΪ255
	lpDst = (char *)lpNewDIBBits;
	memset(lpDst, (BYTE)255, lWidth * lHeight);
	//���ҵ������Ϸ��ı߽���
	bFindStartPoint = false;
	for (j = 0;j < lHeight && !bFindStartPoint;j++)
	{
		for(i = 0;i < lWidth && !bFindStartPoint;i++)
		{
			// ָ��Դͼ��������j�У���i�����ص�ָ��			
			lpSrc = (char *)lpDIBBits + lWidth * j + i;
			//ȡ�õ�ǰָ�봦������ֵ��ע��Ҫת��Ϊunsigned char��
			pixel = (unsigned char)*lpSrc;
			if(pixel == 0)
			{
				bFindStartPoint = true;
				StartPoint.Height = j;
				StartPoint.Width = i;
				// ָ��Ŀ��ͼ��������j�У���i�����ص�ָ��			
				lpDst = (char *)lpNewDIBBits + lWidth * j + i;	
				*lpDst = (unsigned char)0;
			}		
		}
	}
	//������ʼ���������·�������ʼɨ�������Ϸ���
	BeginDirect = 0;
	//���ٱ߽�
	bFindStartPoint = false;
	//�ӳ�ʼ�㿪ʼɨ��
	CurrentPoint.Height = StartPoint.Height;
	CurrentPoint.Width = StartPoint.Width;
	while(!bFindStartPoint)
	{
		bFindPoint = false;
		while(!bFindPoint)
		{
			//��ɨ�跽���鿴һ������
			lpSrc = (char *)lpDIBBits + lWidth * ( CurrentPoint.Height + Direction[BeginDirect][1]) + (CurrentPoint.Width + Direction[BeginDirect][0]);
			pixel = (unsigned char)*lpSrc;
			if(pixel == 0)
			{
				bFindPoint = true;
				CurrentPoint.Height = CurrentPoint.Height + Direction[BeginDirect][1];
				CurrentPoint.Width = CurrentPoint.Width + Direction[BeginDirect][0];
				if(CurrentPoint.Height == StartPoint.Height && CurrentPoint.Width == StartPoint.Width)
				{
					bFindStartPoint = true;
				}
				lpDst = (char *)lpNewDIBBits + lWidth * CurrentPoint.Height + CurrentPoint.Width;
				*lpDst = (unsigned char)0;
				//ɨ���ķ�����ʱ����ת����
				BeginDirect--;
				if(BeginDirect == -1)
					BeginDirect = 7;
				BeginDirect--;
				if(BeginDirect == -1)
					BeginDirect = 7;
			}
			else
			{
				//ɨ�跽��˳ʱ����תһ��
				BeginDirect++;
				if(BeginDirect == 8)
					BeginDirect = 0;
			}
		}
	}
	// ���Ƹ�ʴ����ͼ��
	memcpy(lpDIBBits, lpNewDIBBits, lWidth * lHeight);
	// �ͷ��ڴ�
	LocalUnlock(hNewDIBBits);
	LocalFree(hNewDIBBits);
	//
	//
	for (int yy=0; yy<superImage->height; yy++) 
	{
		for (int xx=0; xx<superImage->width; xx++) 
		{
			unsigned char point = lpDIBBits[lWidth * yy + xx];            
            superImage->data[yy*superImage->width+xx] = point; 
		}
	}
	//
	LocalUnlock(lpDIBBits);
	LocalFree(lpDIBBits);
	// ����
	return TRUE;
}
int EnhancedImage::edge()
{
	//
	LONG lWidth = superImage->width;
	LONG lHeight = superImage->height;
	//
	LPSTR lpDIBBits = (char *)LocalAlloc(LHND, lWidth * lHeight);
	if (lpDIBBits == NULL)
	{
		return false ;
	}	
	lpDIBBits = (char *)LocalLock(lpDIBBits);
	//
	for (int y=0; y<superImage->height; y++) 
	{
		for (int x=0; x<superImage->width; x++) 
		{
			unsigned char point = superImage->data[y*superImage->width+x];            
			lpDIBBits[lWidth * y + x] = point; 
		}
	}
	//		
	//
	// ָ��Դͼ����ָ��
	LPSTR	lpSrc;
	// ָ�򻺴�ͼ����ָ��
	LPSTR	lpDst;
	// ָ�򻺴�DIBͼ����ָ��
	LPSTR	lpNewDIBBits;
	HLOCAL	hNewDIBBits;
	//ѭ������
	long i;
	long j;
	unsigned char n,e,s,w,ne,se,nw,sw;
	//����ֵ
	unsigned char pixel;
	// ��ʱ�����ڴ棬�Ա�����ͼ��
	hNewDIBBits = LocalAlloc(LHND, lWidth * lHeight);
	if (hNewDIBBits == NULL)
	{
		// �����ڴ�ʧ��
		return FALSE;
	}
	// �����ڴ�
	lpNewDIBBits = (char * )LocalLock(hNewDIBBits);
	// ��ʼ���·������ڴ棬�趨��ʼֵΪ255
	lpDst = (char *)lpNewDIBBits;
	memset(lpDst, (BYTE)255, lWidth * lHeight);
	for(j = 1; j <lHeight-1; j++)
	{
		for(i = 1;i <lWidth-1; i++)
		{
			// ָ��Դͼ��������j�У���i�����ص�ָ��	
			lpSrc = (char *)lpDIBBits + lWidth * j + i;
			// ָ��Ŀ��ͼ��������j�У���i�����ص�ָ��
			lpDst = (char *)lpNewDIBBits + lWidth * j + i;
			//ȡ�õ�ǰָ�봦������ֵ��ע��Ҫת��Ϊunsigned char��
			pixel = (unsigned char)*lpSrc;
			if(pixel == 0)
			{
				*lpDst = (unsigned char)0;
				nw = (unsigned char)*(lpSrc + lWidth -1);
				n  = (unsigned char)*(lpSrc + lWidth );
				ne = (unsigned char)*(lpSrc + lWidth +1);
				w = (unsigned char)*(lpSrc -1);
				e = (unsigned char)*(lpSrc +1);
				sw = (unsigned char)*(lpSrc - lWidth -1);
				s  = (unsigned char)*(lpSrc - lWidth );
				se = (unsigned char)*(lpSrc - lWidth +1);
				//�������ڵİ˸��㶼�Ǻڵ�
				if(nw+n+ne+w+e+sw+s+se==0)
				{
					*lpDst = (unsigned char)255;
				}
			}
		}
	}
	// ���Ƹ�ʴ����ͼ��
	memcpy(lpDIBBits, lpNewDIBBits, lWidth * lHeight);
	// �ͷ��ڴ�
	LocalUnlock(hNewDIBBits);
	LocalFree(hNewDIBBits);
	//
	//
	for (int yy=0; yy<superImage->height; yy++) 
	{
		for (int xx=0; xx<superImage->width; xx++) 
		{
			unsigned char point = lpDIBBits[lWidth * yy + xx];            
            superImage->data[yy*superImage->width+xx] = point; 
		}
	}
	//
	LocalUnlock(lpDIBBits);
	LocalFree(lpDIBBits);
	// ����
	return TRUE;
}

int EnhancedImage::thin()
{
	//
	LONG lWidth = superImage->width;
	LONG lHeight = superImage->height;
	//
	LPSTR lpDIBBits = (char *)LocalAlloc(LHND, lWidth * lHeight);
	if (lpDIBBits == NULL)
	{
		return false ;
	}	
	lpDIBBits = (char *)LocalLock(lpDIBBits);
	//
	for (int y=0; y<superImage->height; y++) 
	{
		for (int x=0; x<superImage->width; x++) 
		{
			unsigned char point = superImage->data[y*superImage->width+x];            
            lpDIBBits[lWidth * y + x] = point; 
		}
	}
	//
	//
	LPSTR	lpSrc;				
	LPSTR	lpDst;	
	LPSTR	lpNewDIBBits;	
	HLOCAL	hNewDIBBits;	
	BOOL bModified;				
	long i,j,m,n;		
	
	BOOL con1;
	BOOL con2;
	BOOL con3;
	BOOL con4;
	
	unsigned char nCount;		
	unsigned char pixel;		
	unsigned char ne[5][5];	
	
	hNewDIBBits = LocalAlloc(LHND, lWidth * lHeight);
	if (hNewDIBBits == NULL)
	{
		return false ;
	}
	
	lpNewDIBBits = (char * )LocalLock(hNewDIBBits);
	
	// ��ʼ���·������ڴ棬�趨��ʼֵΪ255
	lpDst = (char *)lpNewDIBBits;
	memset(lpDst, (BYTE)255, lWidth * lHeight);
	
	bModified = TRUE;
	while(bModified)
	{
		bModified = FALSE;
		lpDst = (char *)lpNewDIBBits;
		memset(lpDst, (BYTE)255, lWidth * lHeight);
		
		for(j = 2; j <lHeight-2; j++)
		{
			for(i = 2;i <lWidth-2; i++)
			{
				con1 = FALSE;
				con2 = FALSE;
				con3 = FALSE;
				con4 = FALSE;
				
				lpSrc = (char *)lpDIBBits + lWidth * j + i;		
				lpDst = (char *)lpNewDIBBits + lWidth * j + i;
				
				pixel = (unsigned char)*lpSrc;
				if(pixel != 255 && *lpSrc != 0)
				{
					continue;
				}
				else if(pixel == 255)
				{
					continue;
				}
				
				//��ɫ��0��������ɫ��1����
				for (m = 0;m < 5;m++ )
				{
					for (n = 0;n < 5;n++)
					{
						ne[m][n] =(255 - (unsigned char)*(lpSrc + ((4 - m) - 2)*lWidth + n - 2 )) / 255;
					}
				}
				//�ж�2<=NZ(P1)<=6
				nCount =  ne[1][1] + ne[1][2] + ne[1][3] 
					+ ne[2][1]            + ne[2][3] 
					+ ne[3][1] + ne[3][2] + ne[3][3];
				if ( nCount >= 2 && nCount <=6)
				{
					con1 = TRUE;
				}
				
				//�ж�Z0(P1)=1
				nCount = 0;
				if (ne[1][2] == 0 && ne[1][1] == 1)
					nCount++;
				if (ne[1][1] == 0 && ne[2][1] == 1)
					nCount++;
				if (ne[2][1] == 0 && ne[3][1] == 1)
					nCount++;
				if (ne[3][1] == 0 && ne[3][2] == 1)
					nCount++;
				if (ne[3][2] == 0 && ne[3][3] == 1)
					nCount++;
				if (ne[3][3] == 0 && ne[2][3] == 1)
					nCount++;
				if (ne[2][3] == 0 && ne[1][3] == 1)
					nCount++;
				if (ne[1][3] == 0 && ne[1][2] == 1)
					nCount++;
				if (nCount == 1)
					con2 = TRUE;
				//�ж�P2*P4*P6=0 or Z0(p4)!=1
				if (ne[1][2]*ne[2][1]*ne[3][2] == 0)
				{
					con3 = TRUE;
				}
				else
				{
					nCount = 0;
					if (ne[1][1] == 0 && ne[1][0] == 1)
						nCount++;
					if (ne[1][0] == 0 && ne[2][0] == 1)
						nCount++;
					if (ne[2][0] == 0 && ne[3][0] == 1)
						nCount++;
					if (ne[3][0] == 0 && ne[3][1] == 1)
						nCount++;
					if (ne[3][1] == 0 && ne[3][2] == 1)
						nCount++;
					if (ne[3][2] == 0 && ne[2][2] == 1)
						nCount++;
					if (ne[2][2] == 0 && ne[1][2] == 1)
						nCount++;
					if (ne[1][2] == 0 && ne[1][1] == 1)
						nCount++;
					if (nCount != 1)
						con3 = TRUE;
				}
				//�ж�P2*P4*P8=0 or Z0(p2)!=1
				if (ne[1][2]*ne[2][1]*ne[2][3] == 0)
				{
					con4 = TRUE;
				}
				else
				{
					nCount = 0;
					if (ne[0][2] == 0 && ne[0][1] == 1)
						nCount++;
					if (ne[0][1] == 0 && ne[1][1] == 1)
						nCount++;
					if (ne[1][1] == 0 && ne[2][1] == 1)
						nCount++;
					if (ne[2][1] == 0 && ne[2][2] == 1)
						nCount++;
					if (ne[2][2] == 0 && ne[2][3] == 1)
						nCount++;
					if (ne[2][3] == 0 && ne[1][3] == 1)
						nCount++;
					if (ne[1][3] == 0 && ne[0][3] == 1)
						nCount++;
					if (ne[0][3] == 0 && ne[0][2] == 1)
						nCount++;
					if (nCount != 1)
						con4 = TRUE;
				}
				
				if(con1 && con2 && con3 && con4)
				{
					*lpDst = (unsigned char)255;
					bModified = TRUE;
				}
				else
				{
					*lpDst = (unsigned char)0;
				}
			}
		}		
		memcpy(lpDIBBits, lpNewDIBBits, lWidth * lHeight);
	}
	memcpy(lpDIBBits, lpNewDIBBits, lWidth * lHeight);
	LocalUnlock(hNewDIBBits);
	LocalFree(hNewDIBBits);
	//
	//
	for (int yy=0; yy<superImage->height; yy++) 
	{
		for (int xx=0; xx<superImage->width; xx++) 
		{
			unsigned char point = lpDIBBits[lWidth * yy + xx];            
            superImage->data[yy*superImage->width+xx] = point; 
		}
	}
	//
	LocalUnlock(lpDIBBits);
	LocalFree(lpDIBBits);
}
int EnhancedImage::tidy()
{
	//һ�����õ��㷨����Ҫ������֮�󣬻���֤ԭ������ͨ�ԣ����ڻ�������
	int h = this->superImage->height;
	int w = this->superImage->width;
	short* src = this->superImage->data;
	//
	for (int y=0; y<h; y++) 
	{
		for (int x=0; x<w; x++) 
		{
			unsigned char o = src[w*(y)+(x)];
			//
			unsigned char u = -1;					
			unsigned char ur = -1;					
			unsigned char r = -1;					
			unsigned char br = -1;					
			unsigned char b = -1;					
			unsigned char bl = -1;					
			unsigned char l = -1;					
			unsigned char ul = -1;	
			//
			if(y<h)
			{
				u = src[w*(y+1)+(x)];
			}
			if(y<h && x< w)
			{
				ur =src[w*(y+1)+(x+1)];
			}
			if(x<w)
			{
				r=src[w*(y)+(x+1)];
			}
			if(y>0 && x<w)
			{
				br = src[w*(y-1)+(x+1)];
			}
			if(y>0)
			{
				b = src[w*(y-1)+(x)];
			}
			if(y>0 && x>0)
			{
				bl = src[w*(y-1)+(x-1)];
			}
			if(x>0)
			{
				l = src[w*(y)+(x-1)];
			}
			if(y<h && x>0)
			{
				ul = src[w*(y+1)+(x-1)];
			}		
			//
			if(o==0)
			{
				if(r==0 && u==0 &&  br==0)
				{
					src[w*(y)+(x+1)] = 255;
				}
				if(r==0 && ur==0 &&  r==0)
				{
					src[w*(y)+(x+1)] = 255;
				}
				if(r==0 && ul==0 &&  br==0)
				{
					src[w*(y)+(x+1)] = 255;
				}
				//
				if(l==0 && u==0 &&  bl==0)
				{
                    src[w*(y)+(x-1)] = 255;
				}
				if(l==0 && u==0 &&  ur==0)
				{
                    src[w*(y)+(x-1)] = 255;
				}
				if(l==0 && bl==0 &&  ur==0)
				{
                    src[w*(y)+(x-1)] = 255;
				}
				if(l==0 && bl==0 &&  r==0)
				{
                    src[w*(y)+(x-1)] = 255;
				}
				if(l==0 && ul==0 &&  r==0)
				{
                    src[w*(y)+(x-1)] = 255;
				}
				if(l==0 && ul==0 &&  br==0)
				{
                    src[w*(y)+(x-1)] = 255;
				}
			}
		}
	}
	return 0;
}

int EnhancedImage::kerf()
{
	int w = this->superImage->width;
	int h = this->superImage->height;	
	short* src = this->superImage->data;
	//
	SuperImage<Pixel>* tmpD = new SuperImage<Pixel>(w,h);
	short* tgt = tmpD->data;
	//
	for (int y=0; y<h; y++) 
	{
		for (int x=0; x<w; x++) 
		{
			int count = 0;
			unsigned char p = src[y*w+x];
			tgt[y*w+x] = p;
			//			
			if(y<h && src[w*(y+1)+(x)]  == 0)
			{
				count = count + 1;
			}
			if(y<h && x< w && src[w*(y+1)+(x+1)]  == 0)
			{
				count = count + 1;
			}
			if(x<w && src[w*(y)+(x+1)]  == 0)
			{
				count = count + 1;
			}
			if(y>0 && x<w && src[w*(y-1)+(x+1)]  == 0)
			{
				count = count + 1;
			}
			if(y>0 && src[w*(y-1)+(x)]  == 0)
			{
				count = count + 1;
			}
			if(y>0 && x>0 && src[w*(y-1)+(x-1)]  == 0)
			{
				count = count + 1;
			}
			if(x>0 && src[w*(y)+(x-1)]  == 0)
			{
				count = count + 1;
			}
			if(y<h && x>0 && src[w*(y+1)+(x-1)]  == 0)
			{
				count = count + 1;
			}
			//
			if(p == 0 && count > 2)
			{
				tgt[y*w+x] = -1;
			}
		}
	}
	//
	if(superImage)
	{
		delete superImage;
		superImage = NULL;
	}
	//
	superImage = tmpD;
	//
	return 0;
}
int EnhancedImage::join()
{
	return 0;
}

//AntiCaptchaPart1.cpp
#include <stdio.h>
#include <string>
#include <windows.h>
#include "common.h"
//
void process(char* loadPathName,char* tempPathName)
{
	EnhancedImage otsuImage;
	otsuImage.load(loadPathName);
	if(1)
	{
		char convPathName[MAX_PATH];
		sprintf(convPathName,"%s%s",tempPathName,".001.conv.bmp");
		otsuImage.save(convPathName);
	}
	if(1)
	{
		char binvPathName[MAX_PATH];
		sprintf(binvPathName,"%s%s",tempPathName,".002.binv.bmp");
		otsuImage.binv();
		otsuImage.save(binvPathName);
	}
	if(1)
	{
		char otsuPathName[MAX_PATH];
		sprintf(otsuPathName,"%s%s",tempPathName,".003.otsu.bmp");
		otsuImage.otsu();
		otsuImage.save(otsuPathName);
	}
	if(0)
	{
		char linePathName[MAX_PATH];
		sprintf(linePathName,"%s%s",tempPathName,".004.line.bmp");
		otsuImage.line();
		otsuImage.save(linePathName);
	}
	if(1)
	{
		char roiiPathName[MAX_PATH];
		sprintf(roiiPathName,"%s%s",tempPathName,".005.roii.bmp");
		otsuImage.roii();
		otsuImage.save(roiiPathName);
	}
	EnhancedImage tracImage;
	tracImage.copy(&otsuImage);
	if(1)
	{
		char tracPathName[MAX_PATH];
		sprintf(tracPathName,"%s%s",tempPathName,".006.trac.bmp");
		tracImage.trac();
		tracImage.save(tracPathName);
	}
	//
	EnhancedImage edgeImage;
	edgeImage.copy(&otsuImage);
	if(1)
	{
		char edgePathName[MAX_PATH];
		sprintf(edgePathName,"%s%s",tempPathName,".007.edge.bmp");
		edgeImage.edge();
		edgeImage.save(edgePathName);
	}
	//
	EnhancedImage thinImage;
	thinImage.copy(&otsuImage);
	if(1)
	{
		char thinPathName[MAX_PATH];
		sprintf(thinPathName,"%s%s",tempPathName,".008.thin.bmp");
		thinImage.thin();
		thinImage.save(thinPathName);
	}
	if(1)
	{
		char tidyPathName[MAX_PATH];
		sprintf(tidyPathName,"%s%s",tempPathName,".009.tidy.bmp");
		thinImage.tidy();
		thinImage.save(tidyPathName);
	}
	EnhancedImage kerfImage;
	kerfImage.copy(&thinImage);
	if(1)
	{
		char kerfPathName[MAX_PATH];
		sprintf(kerfPathName,"%s%s",tempPathName,".010.kerf.bmp");
		kerfImage.kerf();
		kerfImage.save(kerfPathName);
	}
	EnhancedImage filmImage;
	filmImage.copy(&kerfImage);
	if(1)
	{	
		char filmPathName[MAX_PATH];
		sprintf(filmPathName,"%s%s",tempPathName,".011.film.bmp");
		filmImage.film(&edgeImage);
	    filmImage.save(filmPathName);
	}
}
//
void travel()
{
    char homePathName[MAX_PATH];
	GetCurrentDirectory(MAX_PATH,homePathName);
	//
	SetCurrentDirectory(homePathName);
	SetCurrentDirectory(".\\output");
	WIN32_FIND_DATA	findDataDelete;
	HANDLE	hHandleDelete  =  FindFirstFile("*.*", &findDataDelete);
	int hasNextFileDelete = (hHandleDelete !=  INVALID_HANDLE_VALUE);
	while (hasNextFileDelete !=  0)
	{
		char deletePathName[MAX_PATH];
		GetFullPathName(findDataDelete.cFileName, MAX_PATH, deletePathName, NULL);
		printf("Delete %s\n",deletePathName);
		DeleteFile(deletePathName);
        hasNextFileDelete = FindNextFile(hHandleDelete, &findDataDelete);
	}
	if(hHandleDelete !=  INVALID_HANDLE_VALUE)
	{
		FindClose(hHandleDelete);
	}
	//
	//
	SetCurrentDirectory(homePathName);
	SetCurrentDirectory(".\\sample");
	WIN32_FIND_DATA	findData;
	HANDLE	hFindHandle  =  FindFirstFile("*.jpg", &findData);
	int hasNextFile = (hFindHandle !=  INVALID_HANDLE_VALUE);
	while (hasNextFile !=  0)
	{
		char loadPathName[MAX_PATH];
		GetFullPathName(findData.cFileName, MAX_PATH, loadPathName, NULL);		
		//
		char tempPathName[MAX_PATH];
        sprintf(tempPathName,"%s",loadPathName);
		for(int i=strlen(tempPathName);i>=0;i--)
		{
			if(tempPathName[i]=='\\')
			{
				break;
			}
			else
			{
				tempPathName[i]='\0';
			}
		}
		strcat(tempPathName,"..\\output\\");
		strcat(tempPathName,findData.cFileName);
		//
		printf("Process %s to %s\n",loadPathName,tempPathName);
		process(loadPathName,tempPathName);
		//
		//
		hasNextFile = FindNextFile(hFindHandle, &findData);
	}
	if(hFindHandle !=  INVALID_HANDLE_VALUE)
	{
		FindClose(hFindHandle);
	}
}
//
void main(int argc, char* argv[])
{
	printf("Anti Captcha ...\n");
	travel();
	printf("Anti Captcha !!!\n");
}
